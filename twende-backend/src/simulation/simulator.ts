// src/simulation/simulator.ts
//
// ═══════════════════════════════════════════════════════════════════════════════
// TWENDE SIMULATION ENGINE v3.2  —  auto-board + approach notifications
// ═══════════════════════════════════════════════════════════════════════════════
//
// WHAT CHANGED FROM v3.1:
//  - PROXIMITY_WINDOW widened to 18 (was 6) so stop-to-road mapping gaps are
//    bridged even when DB coords are not exactly on the OSRM path.
//  - buildStopProximityMap tolerance raised to 1.5 km (was 0.5 km) so stops
//    slightly off the road are still mapped.
//  - checkRealPickups uses a secondary distance-from-road-point fallback: if
//    no stopId matches within the proximity window it checks raw lat/lng
//    distance (≤ 300 m) so passengers at stops not mapped to a path index are
//    still picked up.
//  - New: broadcastUpdate emits a passenger:approaching event via socket when
//    a matatu's ETA to a waiting passenger's stop is ≤ 10 minutes. This drives
//    the PWA notification on the frontend without any extra polling.
//  - Auto-board: passengers are boarded automatically; no manual "Board" tap
//    needed. Same for alighting — already automatic, no change needed there.
// ═══════════════════════════════════════════════════════════════════════════════

import { query } from '../config/db'
import { calculateETA, haversineDistance } from '../utils/haversine'
import { getFullRoutePath } from '../utils/osrm'
import { getCachedRoute, setCachedRoute } from '../utils/routeCache'
import { getIO } from '../socket'
import { sendNotification } from '../utils/notificationHelper'

// ─── Simulation constants ─────────────────────────────────────────────────────

const TICK_MS              = 800
const METRES_PER_TICK      = 12
const MIN_RIDE_KM          = 0.8
const STOPS_PER_LEG        = 6
const MIN_SPAWN_KM         = 99999   // disabled — pre-planned stops only
const BOARDING_PAUSE_TICKS = 10
const ALIGHT_WARN_WAYPOINTS = 8

// Widened from 6 → 18 to bridge road-snapping gaps between DB stop coords
// and the actual OSRM path index.
const PROXIMITY_WINDOW = 18

// Distance (km) used as a fallback when a stop isn't mapped to a path index.
// 300 m covers typical stop-to-road offsets in Kenyan town centres.
const STOP_PROXIMITY_FALLBACK_KM = 0.3

// ─── Sim-passenger DB tracking ────────────────────────────────────────────────

const simPassengerCounters: Record<number, number>   = {}
const simPassengerUserIds:  Map<number, number[]>    = new Map()

// ─────────────────────────────────────────────────────────────────────────────
// createSimPassengerInDB
// ─────────────────────────────────────────────────────────────────────────────
async function createSimPassengerInDB(opts: {
  driverId:        number
  routeId:         number
  routeName:       string
  boardedAtStop:   string
  destinationStop: string
  fare:            number
  plateNumber:     string
}): Promise<{ userId: number; tripId: number } | null> {
  const { driverId, routeId, routeName, boardedAtStop, destinationStop, fare, plateNumber } = opts

  try {
    simPassengerCounters[driverId] = (simPassengerCounters[driverId] ?? 0) + 1
    const n     = simPassengerCounters[driverId]
    const name  = `Sim Passenger ${n}`
    const email = `sim.passenger.${driverId}.${Date.now()}.${n}@twende.sim`

    const userRes = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, 'sim-no-auth', 'passenger')
       RETURNING id`,
      [name, email]
    )
    const userId: number = userRes.rows[0].id

    const existing = simPassengerUserIds.get(driverId) ?? []
    simPassengerUserIds.set(driverId, [...existing, userId])

    const now  = new Date()
    const date = now.toISOString().slice(0, 10)
    const time = now.toTimeString().slice(0, 5)

    const tripRes = await query(
      `INSERT INTO trips
         (passenger_id, driver_id, route_id, route_name,
          from_stop, to_stop, fare, date, time,
          status, payment_status, payment_method,
          matatu_number, started_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,
               'ongoing','cash_pending','cash',
               $10, NOW())
       RETURNING id`,
      [userId, driverId, routeId, routeName,
       boardedAtStop, destinationStop, fare, date, time, plateNumber]
    )
    const tripId: number = tripRes.rows[0].id

    console.log(`[Sim] DB passenger created: ${name} (userId=${userId}, tripId=${tripId})`)
    return { userId, tripId }
  } catch (e: any) {
    console.error('[Sim] createSimPassengerInDB failed:', e.message)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// completeSimPassengerTripInDB
// ─────────────────────────────────────────────────────────────────────────────
async function completeSimPassengerTripInDB(tripId: number, fare: number): Promise<void> {
  try {
    await query(
      `UPDATE trips
       SET status = 'completed',
           payment_status = 'paid',
           ended_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [tripId]
    )
    console.log(`[Sim] Trip ${tripId} completed (fare KSh ${fare})`)
  } catch (e: any) {
    console.error('[Sim] completeSimPassengerTripInDB failed:', e.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// cleanupSimPassengers
// ─────────────────────────────────────────────────────────────────────────────
async function cleanupSimPassengers(driverId: number): Promise<void> {
  const userIds = simPassengerUserIds.get(driverId)
  if (!userIds || userIds.length === 0) return

  console.log(`[Sim] Cleaning up ${userIds.length} sim passengers for driver ${driverId}`)
  try {
    await query(
      `UPDATE trips SET status='cancelled', updated_at=NOW()
       WHERE passenger_id = ANY($1::int[]) AND status = 'ongoing'`,
      [userIds]
    )
    await query(
      `UPDATE waiting_passengers SET status='cancelled'
       WHERE passenger_id = ANY($1::int[])
         AND status IN ('waiting','accepted','boarded')`,
      [userIds]
    )
    await query(`DELETE FROM users WHERE id = ANY($1::int[])`, [userIds])
  } catch (e: any) {
    console.error('[Sim] cleanupSimPassengers failed:', e.message)
  }

  simPassengerUserIds.delete(driverId)
  delete simPassengerCounters[driverId]
  console.log(`[Sim] Cleanup done for driver ${driverId}`)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SimDirection = 'forward' | 'backward'

export interface OnboardPassenger {
  waitingId:           number | null
  passengerId:         number | null
  passengerName:       string
  boardedAtStop:       string
  boardedAtPathIdx:    number
  destinationStopName: string
  destinationPathIdx:  number
  tripId:              number | null
  paidViaMpesa:        boolean
  isVirtual:           boolean
  fare:                number
  alightWarned:        boolean
  simUserId:           number | null
}

interface VirtualWaitingPassenger {
  id:              number
  pathIdx:         number
  lat:             number
  lng:             number
  name:            string
  destinationIdx:  number
  destinationName: string
  destinationLat:  number
  destinationLng:  number
}

interface SimulatedDriver {
  driverId:        number
  routeId:         number
  routeName:       string
  plateNumber:     string
  driverName:      string
  averageRating:   number
  profileImageUrl: string | null
  capacity:        number

  waypoints:    { lat: number; lng: number }[]
  currentIndex: number
  direction:    SimDirection
  timer:        NodeJS.Timeout | null

  lastBroadcastLat: number
  lastBroadcastLng: number
  currentSpeedKph:  number

  isWaiting:    boolean
  pauseCounter: number
  pauseLimit:   number

  passengerCount:    number
  onboardPassengers: OnboardPassenger[]
  virtualWaiting:    VirtualWaitingPassenger[]

  stopProximityMap:     Map<number, number>
  triggeredStopIndices: Set<number>

  plannedStopIndices: number[]
  stopsUsedThisLeg:   Set<number>

  kmSinceLastSpawn:      number
  virtualPassengerIdSeq: number
  totalWaypoints:        number

  // Track which waiting passengers have already been sent a 10-min approach
  // notification so we don't spam them on every tick.
  approachNotifiedIds: Set<number>
}

const activeSimulations = new Map<number, SimulatedDriver>()

// ─── Random helpers ───────────────────────────────────────────────────────────

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

const randomFrom = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)]

const KENYAN_NAMES = [
  'Wanjiku', 'Kamau', 'Achieng', 'Oduya', 'Mutua', 'Njeri', 'Otieno',
  'Waweru', 'Chebet', 'Kipchoge', 'Auma', 'Mwangi', 'Adhiambo', 'Kimani',
  'Zawadi', 'Baraka', 'Amina', 'Hassan', 'Fatuma', 'Kariuki', 'Nyambura',
]

// ─── OSRM path builder ────────────────────────────────────────────────────────

const buildRoadWaypoints = async (
  routeId: number,
  stops: { lat: number; lng: number; name: string }[]
): Promise<{ lat: number; lng: number }[]> => {
  const cached = getCachedRoute(routeId)
  if (cached) {
    console.log(`Route ${routeId}: ${cached.length} cached waypoints`)
    return cached
  }
  try {
    const endpoints = [stops[0], stops[stops.length - 1]]
    const roadPoints = await getFullRoutePath(endpoints)
    setCachedRoute(routeId, roadPoints as any)
    console.log(`Route ${routeId} cached — ${roadPoints.length} waypoints`)
    return roadPoints
  } catch {
    console.warn(`OSRM failed for route ${routeId}, straight-line fallback`)
    return stops
  }
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

const findNearestWaypointIndex = (
  lat: number, lng: number,
  path: { lat: number; lng: number }[]
): number => {
  let closest = 0, minDist = Infinity
  for (let i = 0; i < path.length; i++) {
    const d = haversineDistance(lat, lng, path[i].lat, path[i].lng)
    if (d < minDist) { minDist = d; closest = i }
  }
  return closest
}

const buildStopProximityMap = (
  stops: { id: number; lat: number; lng: number; name: string }[],
  path:  { lat: number; lng: number }[]
): Map<number, number> => {
  const map = new Map<number, number>()
  // Raised tolerance from 0.5 km → 1.5 km.  DB stop coords are often placed
  // at the centre of a junction or market square, not the exact road pixel.
  for (const stop of stops.slice(1, -1)) {
    const idx  = findNearestWaypointIndex(stop.lat, stop.lng, path)
    const dist = haversineDistance(stop.lat, stop.lng, path[idx].lat, path[idx].lng)
    if (dist < 1.5) {
      map.set(stop.id, idx)
      console.log(`  Stop "${stop.name}" → idx ${idx} (${(dist * 1000).toFixed(0)}m)`)
    } else {
      // Still map it — just log the large distance so ops can fix coords later.
      map.set(stop.id, idx)
      console.warn(`  Stop "${stop.name}" ${(dist * 1000).toFixed(0)}m from road — mapped anyway (idx ${idx})`)
    }
  }
  return map
}

const isAhead = (currentIdx: number, targetIdx: number, dir: SimDirection): boolean =>
  dir === 'forward' ? targetIdx > currentIdx : targetIdx < currentIdx

const isNearIndex = (a: number, b: number): boolean =>
  Math.abs(a - b) <= PROXIMITY_WINDOW

const estimateFare = (
  waypoints: { lat: number; lng: number }[],
  fromIdx: number, toIdx: number
): number => {
  const a = waypoints[fromIdx], b = waypoints[toIdx]
  if (!a || !b) return 50
  return Math.max(30, Math.round(30 + haversineDistance(a.lat, a.lng, b.lat, b.lng) * 8))
}

const findDestinationAhead = (
  sim: SimulatedDriver,
  fromIdx: number
): number | null => {
  const path  = sim.waypoints
  const total = path.length

  if (sim.direction === 'forward') {
    let dist = 0, i = fromIdx
    while (i < total - 1) {
      dist += haversineDistance(path[i].lat, path[i].lng, path[i+1].lat, path[i+1].lng)
      i++
      if (dist >= MIN_RIDE_KM) break
    }
    if (i >= total - 2) return null
    const destMax = Math.min(total - 1, i + Math.floor((total - i) * 0.6))
    return destMax > i ? randomInt(i, destMax) : null
  } else {
    let dist = 0, i = fromIdx
    while (i > 0) {
      dist += haversineDistance(path[i].lat, path[i].lng, path[i-1].lat, path[i-1].lng)
      i--
      if (dist >= MIN_RIDE_KM) break
    }
    if (i <= 1) return null
    const destMin = Math.max(0, i - Math.floor(i * 0.6))
    return destMin < i ? randomInt(destMin, i) : null
  }
}

const advanceByDistance = (
  sim: SimulatedDriver,
  targetMetres: number
): { newIndex: number; metresCovered: number; hitEnd: boolean } => {
  const path  = sim.waypoints
  const total = path.length
  let   idx   = sim.currentIndex
  let   covered = 0
  let   hitEnd  = false

  if (sim.direction === 'forward') {
    while (idx < total - 1 && covered < targetMetres / 1000) {
      covered += haversineDistance(path[idx].lat, path[idx].lng, path[idx+1].lat, path[idx+1].lng)
      idx++
    }
    if (idx >= total - 1) hitEnd = true
  } else {
    while (idx > 0 && covered < targetMetres / 1000) {
      covered += haversineDistance(path[idx].lat, path[idx].lng, path[idx-1].lat, path[idx-1].lng)
      idx--
    }
    if (idx <= 0) hitEnd = true
  }

  return { newIndex: idx, metresCovered: covered * 1000, hitEnd }
}

const computeSpeed = (sim: SimulatedDriver, metresCovered: number): number => {
  const distKm  = metresCovered / 1000
  const timeHrs = TICK_MS / 3_600_000
  const raw     = distKm / timeHrs
  const smoothed = sim.currentSpeedKph * 0.6 + raw * 0.4
  return Math.round(Math.min(80, Math.max(0, smoothed)))
}

// ─── Stop simulation ──────────────────────────────────────────────────────────

export const stopSimulation = (driverId: number): void => {
  const sim = activeSimulations.get(driverId)
  if (sim?.timer) { clearInterval(sim.timer); sim.timer = null }
  activeSimulations.delete(driverId)

  cleanupSimPassengers(driverId).catch(() => {})

  query(
    'UPDATE driver_profiles SET is_active = false WHERE user_id = $1',
    [driverId]
  ).catch(() => {})

  try {
    getIO().emit(`driver:${driverId}:sim_stopped`, {})
  } catch (_) {}

  console.log(`Simulation stopped for driver ${driverId}`)
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

const createOngoingTrip = async (
  passengerId: number, driverId: number, routeId: number,
  routeName: string, plateNumber: string, fromStop: string, toStop: string
): Promise<number | null> => {
  try {
    const r = await query(
      `INSERT INTO trips
         (passenger_id, driver_id, route_id, from_stop, to_stop,
          route_name, date, time, fare, status, matatu_number,
          payment_status, started_at)
       VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,TO_CHAR(NOW(),'HH12:MI AM'),
               0,'ongoing',$7,'unpaid',NOW())
       RETURNING id`,
      [passengerId, driverId, routeId, fromStop, toStop, routeName, plateNumber]
    )
    return r.rows[0].id
  } catch (e: any) {
    console.error('createOngoingTrip:', e.message)
    return null
  }
}

const completeTrip = async (
  tripId: number, passengerId: number, driverId: number,
  paidViaMpesa: boolean, fare: number
): Promise<void> => {
  try {
    const paymentStatus = paidViaMpesa ? 'paid' : 'cash_pending'
    await query(
      `UPDATE trips SET status='completed', fare=$1,
          payment_status=$2, payment_method=$3, ended_at=NOW(), updated_at=NOW()
       WHERE id=$4`,
      [fare, paymentStatus, paidViaMpesa ? 'mpesa' : null, tripId]
    )
    await sendNotification({
      userId: passengerId, title: 'Trip Completed',
      message: paidViaMpesa
        ? 'You have arrived! M-Pesa payment confirmed. Thank you for riding with Twende.'
        : 'You have arrived! Please pay the fare in cash. Enjoy your day!',
      type: 'success',
    })
    getIO().emit(`driver:${driverId}:passenger_alighted`, {
      trip_id: tripId, passenger_id: passengerId,
      payment_status: paymentStatus, fare,
    })
  } catch (e: any) {
    console.error('completeTrip:', e.message)
  }
}

// ─── Broadcast position update + approach notifications ───────────────────────

const broadcastUpdate = async (sim: SimulatedDriver, rawStops: any[]): Promise<void> => {
  const current = sim.waypoints[sim.currentIndex]
  if (!current) return

  const stopsWithETA = rawStops.map((stop: any) => {
    const sLat = parseFloat(stop.lat)
    const sLng = parseFloat(stop.lng)
    const sIdx = findNearestWaypointIndex(sLat, sLng, sim.waypoints)
    const upcoming = isAhead(sim.currentIndex, sIdx, sim.direction)
    return {
      id:          stop.id,
      name:        stop.name,
      lat:         sLat,
      lng:         sLng,
      order_index: stop.order_index,
      eta_minutes: upcoming
        ? calculateETA(current.lat, current.lng, sLat, sLng)
        : null,
      is_upcoming: upcoming,
    }
  })

  const currentPassengersList = sim.onboardPassengers.map(p => ({
    waiting_id:      p.waitingId,
    passenger_id:    p.passengerId,
    passenger_name:  p.passengerName,
    boarded_at_stop: p.boardedAtStop,
    destination:     p.destinationStopName,
    trip_id:         p.tripId,
    paid_via_mpesa:  p.paidViaMpesa,
    payment_display: p.paidViaMpesa ? '✓ M-Pesa' : '⏳ Cash',
    is_virtual:      p.isVirtual,
    fare:            p.fare,
  }))

  const waitingAhead = sim.virtualWaiting
    .filter(vp => isAhead(sim.currentIndex, vp.pathIdx, sim.direction))
    .map(vp => ({
      id:          vp.id,
      name:        vp.name,
      lat:         vp.lat,
      lng:         vp.lng,
      destination: vp.destinationName,
      eta_minutes: calculateETA(current.lat, current.lng, vp.lat, vp.lng),
    }))

  try {
    getIO().emit('matatu:moved', {
      driver_id:          sim.driverId,
      driver_name:        sim.driverName,
      profile_image_url:  sim.profileImageUrl,
      plate_number:       sim.plateNumber,
      route_id:           sim.routeId,
      average_rating:     sim.averageRating,
      lat:                current.lat,
      lng:                current.lng,
      speed:              sim.isWaiting ? 0 : sim.currentSpeedKph,
      direction:          sim.direction,
      waypoint_index:     sim.currentIndex,
      total_waypoints:    sim.totalWaypoints,
      progress_percent:   Math.round((sim.currentIndex / sim.totalWaypoints) * 100),
      passengers:         sim.passengerCount + sim.onboardPassengers.length,
      capacity:           sim.capacity,
      is_waiting:         sim.isWaiting,
      stops_eta:          stopsWithETA,
      current_passengers: currentPassengersList,
      waiting_ahead:      waitingAhead,
      timestamp:          new Date().toISOString(),
      simulated:          true,
    })
  } catch (e) {
    console.error('Socket emit failed (non-fatal):', e)
  }

  // ── 10-minute approach notification for real waiting passengers ────────────
  // Query only active waiting rows for this route so we can find passengers
  // whose stop the matatu will reach in ≤ 10 minutes.
  try {
    const waitingRows = await query(
      `SELECT wp.id, wp.passenger_id,
              s.lat AS stop_lat, s.lng AS stop_lng, s.name AS stop_name
       FROM waiting_passengers wp
       JOIN stops s ON s.id = wp.stop_id
       WHERE wp.route_id = $1
         AND wp.status IN ('waiting','accepted')
         AND wp.expires_at > NOW()`,
      [sim.routeId]
    )

    for (const row of waitingRows.rows) {
      const sLat    = parseFloat(row.stop_lat)
      const sLng    = parseFloat(row.stop_lng)
      const sIdx    = findNearestWaypointIndex(sLat, sLng, sim.waypoints)
      const upcoming = isAhead(sim.currentIndex, sIdx, sim.direction)
      if (!upcoming) continue

      const eta = calculateETA(current.lat, current.lng, sLat, sLng)
      if (eta === null || eta > 10) continue

      // Only fire once per waiting record per simulation run
      if (sim.approachNotifiedIds.has(row.id)) continue
      sim.approachNotifiedIds.add(row.id)

      const passengerId: number = row.passenger_id
      const stopName: string    = row.stop_name
      const plate               = sim.plateNumber

      // Socket event — picked up by MapPage in real time
      getIO().emit(`passenger:${passengerId}:matatu_approaching`, {
        eta_minutes:  Math.round(eta),
        stop_name:    stopName,
        plate_number: plate,
        driver_name:  sim.driverName,
        lat:          current.lat,
        lng:          current.lng,
        message:      `${plate} is about ${Math.round(eta)} min away from ${stopName}. Get ready!`,
      })

      // Push notification (PWA) — shows even if the app is in background
      await sendNotification({
        userId:  passengerId,
        title:   `🚌 Matatu approaching — ${Math.round(eta)} min`,
        message: `${plate} is ${Math.round(eta)} min from ${stopName}. Please be ready to board!`,
        type:    'trip',
      })

      console.log(`[Sim] Approach notified: passenger ${passengerId} at "${stopName}" (eta=${Math.round(eta)}m)`)
    }
  } catch (e: any) {
    // Non-fatal — approach notifications are best-effort
    console.error('[Sim] Approach notification query failed:', e.message)
  }
}

// ─── Check alighting ──────────────────────────────────────────────────────────

const checkAlighting = async (sim: SimulatedDriver): Promise<void> => {
  if (sim.onboardPassengers.length === 0) return

  for (const p of sim.onboardPassengers) {
    if (!p.alightWarned) {
      const dist = Math.abs(sim.currentIndex - p.destinationPathIdx)
      if (dist <= ALIGHT_WARN_WAYPOINTS &&
          !isAhead(p.destinationPathIdx, sim.currentIndex, sim.direction)) {
        p.alightWarned = true
        if (!p.isVirtual && p.passengerId) {
          getIO().emit(`passenger:${p.passengerId}:alighting_soon`, {
            message: `Approaching ${p.destinationStopName} — prepare to alight.`,
            destination: p.destinationStopName,
          })
        }
      }
    }
  }

  const alighting = sim.onboardPassengers.filter(p =>
    isNearIndex(sim.currentIndex, p.destinationPathIdx)
  )

  for (const p of alighting) {
    console.log(`  ✓ ${p.passengerName} alighting → ${p.destinationStopName} | KSh ${p.fare}`)

    if (!p.isVirtual && p.tripId && p.passengerId) {
      getIO().emit(`passenger:${p.passengerId}:alighting`, {
        trip_id:     p.tripId,
        destination: p.destinationStopName,
        fare:        p.fare,
        message:     `You have reached ${p.destinationStopName}. Please alight from ${sim.plateNumber}.`,
      })
      await sendNotification({
        userId: p.passengerId, title: "You've arrived! 📍",
        message: `You have reached ${p.destinationStopName}. Please alight from ${sim.plateNumber}.`,
        type: 'trip',
      })
      await completeTrip(p.tripId, p.passengerId, sim.driverId, p.paidViaMpesa, p.fare)
    } else if (p.isVirtual) {
      if (p.tripId) await completeSimPassengerTripInDB(p.tripId, p.fare)
      getIO().emit(`driver:${sim.driverId}:passenger_alighted`, {
        trip_id:        p.tripId,
        passenger_name: p.passengerName,
        payment_status: p.paidViaMpesa ? 'paid' : 'cash_pending',
        fare:           p.fare,
        is_virtual:     true,
      })
    }
  }

  if (alighting.length > 0) {
    sim.onboardPassengers = sim.onboardPassengers.filter(
      p => !isNearIndex(sim.currentIndex, p.destinationPathIdx)
    )
  }
}

// ─── Check virtual passenger pickups ─────────────────────────────────────────

const checkVirtualPickups = async (sim: SimulatedDriver): Promise<boolean> => {
  const toBoard = sim.virtualWaiting.filter(vp =>
    isNearIndex(sim.currentIndex, vp.pathIdx)
  )
  if (toBoard.length === 0) return false

  for (const vp of toBoard) {
    const occupied = sim.passengerCount + sim.onboardPassengers.length
    if (occupied >= sim.capacity) {
      sim.virtualWaiting = sim.virtualWaiting.filter(w => w.id !== vp.id)
      console.log(`  Full (${occupied}/${sim.capacity}) — ${vp.name} not boarded`)
      continue
    }

    const fare = estimateFare(sim.waypoints, vp.pathIdx, vp.destinationIdx)

    const dbResult = await createSimPassengerInDB({
      driverId:        sim.driverId,
      routeId:         sim.routeId,
      routeName:       sim.routeName,
      boardedAtStop:   `Stop (idx ${vp.pathIdx})`,
      destinationStop: vp.destinationName,
      fare,
      plateNumber:     sim.plateNumber,
    })

    const onboard: OnboardPassenger = {
      waitingId:           null,
      passengerId:         dbResult?.userId ?? null,
      passengerName:       vp.name,
      boardedAtStop:       `Stop (idx ${vp.pathIdx})`,
      boardedAtPathIdx:    vp.pathIdx,
      destinationStopName: vp.destinationName,
      destinationPathIdx:  vp.destinationIdx,
      tripId:              dbResult?.tripId ?? null,
      paidViaMpesa:        Math.random() < 0.35,
      isVirtual:           true,
      fare,
      alightWarned:        false,
      simUserId:           dbResult?.userId ?? null,
    }
    sim.onboardPassengers.push(onboard)
    sim.virtualWaiting = sim.virtualWaiting.filter(w => w.id !== vp.id)

    getIO().emit(`driver:${sim.driverId}:passenger_boarded`, {
      passenger_name:  vp.name,
      stop:            onboard.boardedAtStop,
      destination:     vp.destinationName,
      fare,
      is_virtual:      true,
      payment_display: onboard.paidViaMpesa ? '✓ M-Pesa' : '⏳ Cash',
      trip_id:         dbResult?.tripId ?? null,
    })
    console.log(`  ✓ [Virtual] ${vp.name} boarded → ${vp.destinationName} | KSh ${fare} | DB tripId=${dbResult?.tripId}`)
  }

  return true
}

// ─── Check real DB passenger pickups ─────────────────────────────────────────
// FIX: two-stage matching:
//   1. Index-proximity (isNearIndex) — same as before but with wider window.
//   2. Raw lat/lng distance fallback — catches stops whose DB coords map to
//      a path index far from the matatu's current index but are physically
//      close in metres (e.g. stops not on the OSRM road at all).

const checkRealPickups = async (
  sim: SimulatedDriver, rawStops: any[]
): Promise<boolean> => {
  const current = sim.waypoints[sim.currentIndex]
  if (!current) return false

  // Stage 1: index-proximity (existing logic, wider PROXIMITY_WINDOW)
  const nearStopIds: number[] = []
  for (const [stopId, pathIdx] of sim.stopProximityMap.entries()) {
    if (
      isNearIndex(sim.currentIndex, pathIdx) &&
      isAhead(sim.currentIndex - PROXIMITY_WINDOW, pathIdx, sim.direction) &&
      !sim.triggeredStopIndices.has(pathIdx)
    ) {
      nearStopIds.push(stopId)
    }
  }

  // Stage 2: raw distance fallback — find rawStops within 300 m of current
  // position that weren't captured by stage 1.
  for (const rawStop of rawStops) {
    if (nearStopIds.includes(rawStop.id)) continue // already caught
    const dist = haversineDistance(
      current.lat, current.lng,
      parseFloat(rawStop.lat), parseFloat(rawStop.lng)
    )
    if (dist <= STOP_PROXIMITY_FALLBACK_KM) {
      // Only trigger once per position window (reuse triggeredStopIndices)
      const pathIdx = sim.stopProximityMap.get(rawStop.id) ?? sim.currentIndex
      if (!sim.triggeredStopIndices.has(pathIdx)) {
        nearStopIds.push(rawStop.id)
      }
    }
  }

  if (nearStopIds.length === 0) return false

  try {
    const result = await query(
      `SELECT wp.id, wp.passenger_id, wp.destination_stop_id,
              u.name AS passenger_name, s.name AS stop_name,
              sd.name AS destination_name, sd.lat AS dest_lat, sd.lng AS dest_lng
       FROM waiting_passengers wp
       JOIN users u ON u.id = wp.passenger_id
       JOIN stops s ON s.id = wp.stop_id
       LEFT JOIN stops sd ON sd.id = wp.destination_stop_id
       WHERE wp.route_id = $1
         AND wp.stop_id = ANY($2::int[])
         AND wp.status IN ('waiting','accepted')
         AND wp.expires_at > NOW()`,
      [sim.routeId, nearStopIds]
    )

    // Mark triggered stop indices to avoid double-boarding
    for (const [stopId, pathIdx] of sim.stopProximityMap.entries()) {
      if (nearStopIds.includes(stopId)) {
        for (let w = Math.max(0, pathIdx - PROXIMITY_WINDOW);
             w <= Math.min(sim.waypoints.length - 1, pathIdx + PROXIMITY_WINDOW); w++) {
          sim.triggeredStopIndices.add(w)
        }
      }
    }

    if (result.rows.length === 0) return false

    let didStop = false
    for (const row of result.rows) {
      let destPathIdx = sim.waypoints.length - 1
      if (row.dest_lat && row.dest_lng) {
        destPathIdx = findNearestWaypointIndex(
          parseFloat(row.dest_lat), parseFloat(row.dest_lng), sim.waypoints
        )
      }

      if (!isAhead(sim.currentIndex, destPathIdx, sim.direction)) {
        await sendNotification({
          userId: row.passenger_id, title: 'Different Direction',
          message: `${sim.plateNumber} is heading away from your destination. Please wait for the next matatu.`,
          type: 'warning',
        })
        continue
      }

      const stopName = rawStops.find((s: any) => nearStopIds.includes(s.id))?.name ?? 'Stop'
      const fare     = estimateFare(sim.waypoints, sim.currentIndex, destPathIdx)
      const tripId   = await createOngoingTrip(
        row.passenger_id, sim.driverId, sim.routeId,
        rawStops[0]?.route_name ?? `Route ${sim.routeId}`,
        sim.plateNumber, stopName, row.destination_name ?? 'Unknown'
      )
      if (!tripId) continue

      await query(
        `UPDATE waiting_passengers
         SET status='boarded', boarded_at=NOW(), trip_id=$1, accepted_by_driver_id=$2
         WHERE id=$3`,
        [tripId, sim.driverId, row.id]
      )

      // Clear approach-notification tracking for this waiting record since
      // the passenger has now been boarded automatically.
      sim.approachNotifiedIds.delete(row.id)

      sim.onboardPassengers.push({
        waitingId:           row.id,
        passengerId:         row.passenger_id,
        passengerName:       row.passenger_name,
        boardedAtStop:       stopName,
        boardedAtPathIdx:    sim.currentIndex,
        destinationStopName: row.destination_name ?? 'Unknown',
        destinationPathIdx:  destPathIdx,
        tripId,
        paidViaMpesa:        false,
        isVirtual:           false,
        fare,
        alightWarned:        false,
        simUserId:           null,
      })

      // Auto-board notification: passenger is informed they are now onboard
      // without needing to press any button.
      await sendNotification({
        userId: row.passenger_id, title: "You're on board! 🚌",
        message: `You have boarded ${sim.plateNumber}. Heading to ${row.destination_name ?? 'your destination'}. Fare: KSh ${fare}.`,
        type: 'trip',
        socketEvent: `passenger:${row.passenger_id}:boarded`,
        socketData: {
          trip_id: tripId, plate: sim.plateNumber,
          destination: row.destination_name, driver_name: sim.driverName, fare,
          // auto_boarded flag tells the frontend no manual action was needed
          auto_boarded: true,
        },
      })

      getIO().emit(`driver:${sim.driverId}:passenger_boarded`, {
        passenger_name: row.passenger_name, stop: stopName,
        destination: row.destination_name ?? 'Unknown',
        trip_id: tripId, fare, is_virtual: false, payment_display: '⏳ Cash',
      })

      didStop = true
      console.log(`  ✓ [Real] ${row.passenger_name} AUTO-BOARDED at "${stopName}"`)
    }

    return didStop
  } catch (e: any) {
    console.error('checkRealPickups:', e.message)
    return false
  }
}

// ─── Plan evenly-spaced boarding stops for a leg ─────────────────────────────

const planLegStops = (sim: SimulatedDriver): void => {
  const total = sim.totalWaypoints
  const start = sim.direction === 'forward' ? sim.currentIndex : 0
  const end   = sim.direction === 'forward' ? total - 1 : sim.currentIndex

  if (Math.abs(end - start) < 40) return

  const step = Math.floor(Math.abs(end - start) / (STOPS_PER_LEG + 1))
  const indices: number[] = []

  for (let i = 1; i <= STOPS_PER_LEG; i++) {
    const idx = sim.direction === 'forward'
      ? start + step * i
      : start - step * i
    const jitter  = randomInt(-5, 5)
    const bounded = Math.max(1, Math.min(total - 2, idx + jitter))
    indices.push(bounded)
  }

  sim.plannedStopIndices = indices
  sim.stopsUsedThisLeg   = new Set()
  console.log(`  Planned ${indices.length} boarding stops for this leg`)
}

// ─── Check if matatu is at a planned stop ─────────────────────────────────────

const checkPlannedStops = (sim: SimulatedDriver): void => {
  for (const stopIdx of sim.plannedStopIndices) {
    if (sim.stopsUsedThisLeg.has(stopIdx)) continue
    if (!isNearIndex(sim.currentIndex, stopIdx)) continue

    sim.stopsUsedThisLeg.add(stopIdx)

    const occupied = sim.passengerCount + sim.onboardPassengers.length
    if (occupied >= sim.capacity) {
      console.log(`  Planned stop idx=${stopIdx} skipped — full (${occupied}/${sim.capacity})`)
      continue
    }

    const boardWp = sim.waypoints[stopIdx]
    if (!boardWp) continue

    const destIdx = findDestinationAhead(
      { ...sim, currentIndex: stopIdx } as SimulatedDriver, stopIdx
    )
    if (destIdx === null) continue

    const destWp = sim.waypoints[destIdx]
    if (!destWp) continue

    const vp: VirtualWaitingPassenger = {
      id:              ++sim.virtualPassengerIdSeq,
      pathIdx:         stopIdx,
      lat:             boardWp.lat,
      lng:             boardWp.lng,
      name:            randomFrom(KENYAN_NAMES),
      destinationIdx:  destIdx,
      destinationName: `Stage ${destIdx}`,
      destinationLat:  destWp.lat,
      destinationLng:  destWp.lng,
    }
    sim.virtualWaiting.push(vp)

    const fare = estimateFare(sim.waypoints, stopIdx, destIdx)
    console.log(`  [PlannedStop] ${vp.name} waiting at idx=${stopIdx} → ${destIdx} | KSh ${fare}`)

    try {
      getIO().emit(`driver:${sim.driverId}:passenger_waiting`, {
        virtual_id:      vp.id,
        passenger_name:  vp.name,
        waiting_lat:     vp.lat,
        waiting_lng:     vp.lng,
        destination_lat: vp.destinationLat,
        destination_lng: vp.destinationLng,
        destination:     vp.destinationName,
        fare, is_ahead: true,
      })
    } catch (_) {}
  }
}

// ─── Spawn virtual passengers ────────────────────────────────────────────────

const spawnVirtualPassengers = (sim: SimulatedDriver): void => {
  const count = randomInt(1, 2)

  for (let i = 0; i < count; i++) {
    const minAhead = 20
    let boardIdx: number

    if (sim.direction === 'forward') {
      const start = Math.min(sim.currentIndex + minAhead, sim.totalWaypoints - 2)
      const end   = Math.min(sim.currentIndex + Math.floor((sim.totalWaypoints - sim.currentIndex) * 0.7), sim.totalWaypoints - 2)
      if (start >= end) continue
      boardIdx = randomInt(start, end)
    } else {
      const start = Math.max(sim.currentIndex - minAhead, 1)
      const end   = Math.max(sim.currentIndex - Math.floor(sim.currentIndex * 0.7), 1)
      if (start <= end) continue
      boardIdx = randomInt(end, start)
    }

    const destIdx = findDestinationAhead(
      { ...sim, currentIndex: boardIdx } as SimulatedDriver, boardIdx
    )
    if (destIdx === null) continue

    const boardWp = sim.waypoints[boardIdx]
    const destWp  = sim.waypoints[destIdx]
    if (!boardWp || !destWp) continue

    const vp: VirtualWaitingPassenger = {
      id:              ++sim.virtualPassengerIdSeq,
      pathIdx:         boardIdx,
      lat:             boardWp.lat,
      lng:             boardWp.lng,
      name:            randomFrom(KENYAN_NAMES),
      destinationIdx:  destIdx,
      destinationName: `Stage ${destIdx}`,
      destinationLat:  destWp.lat,
      destinationLng:  destWp.lng,
    }
    sim.virtualWaiting.push(vp)

    const fare = estimateFare(sim.waypoints, boardIdx, destIdx)
    console.log(`  [VirtualPax] ${vp.name} waiting at idx=${boardIdx} → ${destIdx} | KSh ${fare}`)

    try {
      getIO().emit(`driver:${sim.driverId}:passenger_waiting`, {
        virtual_id:      vp.id,
        passenger_name:  vp.name,
        waiting_lat:     vp.lat,
        waiting_lng:     vp.lng,
        destination_lat: vp.destinationLat,
        destination_lng: vp.destinationLng,
        destination:     vp.destinationName,
        fare, is_ahead: true,
      })
    } catch (_) {}
  }

  sim.kmSinceLastSpawn = 0
}

// ─── Handle terminus ──────────────────────────────────────────────────────────

const handleReversal = async (
  sim: SimulatedDriver, newDir: SimDirection, rawStops: any[]
): Promise<void> => {
  console.log(`Driver ${sim.driverId}: reached terminus — alighting all passengers`)

  for (const p of sim.onboardPassengers) {
    const terminusName = newDir === 'backward'
      ? (rawStops[rawStops.length - 1]?.name ?? 'End Terminus')
      : (rawStops[0]?.name ?? 'Start Terminus')

    if (!p.isVirtual && p.tripId && p.passengerId) {
      getIO().emit(`passenger:${p.passengerId}:alighting`, {
        trip_id: p.tripId, destination: terminusName, fare: p.fare,
        message: `You have reached the terminus (${terminusName}). Thank you for riding with Twende!`,
      })
      await sendNotification({
        userId: p.passengerId, title: 'Terminus reached! 📍',
        message: `You have reached ${terminusName}. Please alight from ${sim.plateNumber}.`,
        type: 'trip',
      })
      await completeTrip(p.tripId, p.passengerId, sim.driverId, p.paidViaMpesa, p.fare)
    } else if (p.isVirtual) {
      if (p.tripId) await completeSimPassengerTripInDB(p.tripId, p.fare)
      getIO().emit(`driver:${sim.driverId}:passenger_alighted`, {
        trip_id: p.tripId, passenger_name: p.passengerName,
        payment_status: p.paidViaMpesa ? 'paid' : 'cash_pending',
        fare: p.fare, is_virtual: true,
      })
    }
  }

  sim.onboardPassengers    = []
  sim.passengerCount       = 0
  sim.approachNotifiedIds  = new Set()  // reset approach tracking on new leg

  sim.isWaiting    = true
  sim.pauseCounter = 0
  sim.pauseLimit   = BOARDING_PAUSE_TICKS + 8

  sim.direction = newDir
  sim.triggeredStopIndices.clear()
  sim.virtualWaiting   = []
  sim.kmSinceLastSpawn = 0

  planLegStops(sim)
  spawnVirtualPassengers(sim)

  try {
    const current = sim.waypoints[sim.currentIndex]
    getIO().emit('matatu:direction_changed', {
      driver_id:    sim.driverId,
      direction:    newDir,
      plate_number: sim.plateNumber,
      lat:          current?.lat,
      lng:          current?.lng,
    })
  } catch (_) {}

  console.log(`Driver ${sim.driverId}: terminus → now heading ${newDir}`)
}

// ─── START SIMULATION ─────────────────────────────────────────────────────────

export const startSimulation = async (
  driverId: number,
  speedMultiplier: number = 1
): Promise<{ success: boolean; message: string }> => {
  try {
    if (activeSimulations.has(driverId)) stopSimulation(driverId)

    const driverResult = await query(
      `SELECT dp.*, u.name AS driver_name, u.profile_image_url
       FROM driver_profiles dp JOIN users u ON u.id = dp.user_id
       WHERE dp.user_id = $1`,
      [driverId]
    )
    if (driverResult.rows.length === 0) return { success: false, message: 'Driver not found' }
    const driver = driverResult.rows[0]

    const stopsResult = await query(
      'SELECT id, name, lat, lng, order_index FROM stops WHERE route_id=$1 ORDER BY order_index',
      [driver.route_id]
    )
    if (stopsResult.rows.length < 2) return { success: false, message: 'Route needs at least 2 stops' }

    const rawStops   = stopsResult.rows
    const stopPoints = rawStops.map((s: any) => ({
      id: s.id, lat: parseFloat(s.lat), lng: parseFloat(s.lng), name: s.name,
    }))

    const routeResult = await query('SELECT name FROM routes WHERE id=$1', [driver.route_id])
    const routeName   = routeResult.rows[0]?.name ?? `Route ${driver.route_id}`

    console.log(`\nBuilding road path: "${stopPoints[0].name}" → "${stopPoints[stopPoints.length - 1].name}"`)
    const waypoints = await buildRoadWaypoints(
      driver.route_id,
      stopPoints.map(s => ({ lat: s.lat, lng: s.lng, name: s.name }))
    )
    if (waypoints.length < 2) return { success: false, message: 'Could not build route waypoints' }

    console.log('Building stop proximity indices:')
    const stopProximityMap = buildStopProximityMap(stopPoints, waypoints)

    const metresPerTick = METRES_PER_TICK * Math.max(1, Math.min(10, speedMultiplier))

    let totalRouteKm = 0
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalRouteKm += haversineDistance(
        waypoints[i].lat, waypoints[i].lng,
        waypoints[i+1].lat, waypoints[i+1].lng
      )
    }
    const ticksPerLeg    = Math.ceil((totalRouteKm * 1000) / metresPerTick)
    const secondsPerLeg  = Math.ceil((ticksPerLeg * TICK_MS) / 1000)

    const simDriver: SimulatedDriver = {
      driverId,
      routeId:    driver.route_id,
      routeName,
      plateNumber:     driver.plate_number,
      driverName:      driver.driver_name,
      averageRating:   parseFloat(driver.average_rating) || 0,
      profileImageUrl: driver.profile_image_url,
      capacity:        driver.capacity || 14,

      waypoints,
      currentIndex: 0,
      direction:    'forward',
      timer:        null,

      lastBroadcastLat: waypoints[0].lat,
      lastBroadcastLng: waypoints[0].lng,
      currentSpeedKph:  0,

      isWaiting:    false,
      pauseCounter: 0,
      pauseLimit:   BOARDING_PAUSE_TICKS,

      passengerCount:    randomInt(1, 4),
      onboardPassengers: [],
      virtualWaiting:    [],

      stopProximityMap,
      triggeredStopIndices: new Set(),

      plannedStopIndices:    [],
      stopsUsedThisLeg:      new Set(),

      kmSinceLastSpawn:      0,
      virtualPassengerIdSeq: 0,
      totalWaypoints:        waypoints.length,

      approachNotifiedIds: new Set(),
    }

    planLegStops(simDriver)
    spawnVirtualPassengers(simDriver)

    // ── Main loop ────────────────────────────────────────────────────────────
    simDriver.timer = setInterval(async () => {
      try {
        const current = simDriver.waypoints[simDriver.currentIndex]
        if (!current) { simDriver.currentIndex = 0; return }

        if (simDriver.isWaiting) {
          simDriver.pauseCounter++
          simDriver.currentSpeedKph = 0
          await broadcastUpdate(simDriver, rawStops)

          if (simDriver.pauseCounter >= simDriver.pauseLimit) {
            simDriver.isWaiting    = false
            simDriver.pauseCounter = 0
            const delta = randomInt(-1, 2)
            simDriver.passengerCount = Math.max(
              0, Math.min(simDriver.capacity, simDriver.passengerCount + delta)
            )
          }
          return
        }

        await checkAlighting(simDriver)

        const pickedVirtual = await checkVirtualPickups(simDriver)
        const pickedReal    = await checkRealPickups(simDriver, rawStops)

        if (pickedVirtual || pickedReal) {
          simDriver.isWaiting    = true
          simDriver.pauseCounter = 0
          simDriver.pauseLimit   = pickedReal ? BOARDING_PAUSE_TICKS + 5 : BOARDING_PAUSE_TICKS
          await broadcastUpdate(simDriver, rawStops)
          return
        }

        const { newIndex, metresCovered, hitEnd } = advanceByDistance(simDriver, metresPerTick)

        simDriver.currentSpeedKph  = computeSpeed(simDriver, metresCovered)
        simDriver.kmSinceLastSpawn += metresCovered / 1000
        simDriver.currentIndex     = newIndex

        checkPlannedStops(simDriver)
        await broadcastUpdate(simDriver, rawStops)

        const pos = simDriver.waypoints[simDriver.currentIndex]
        if (pos) {
          query(
            `UPDATE driver_profiles SET last_lat=$1, last_lng=$2, is_active=true, updated_at=NOW() WHERE user_id=$3`,
            [pos.lat, pos.lng, driverId]
          ).catch((e: Error) => console.error('DB pos update failed:', e.message))
        }

        if (hitEnd) {
          simDriver.currentIndex = simDriver.direction === 'forward'
            ? simDriver.totalWaypoints - 1
            : 0
          const nextDir = simDriver.direction === 'forward' ? 'backward' : 'forward'
          await handleReversal(simDriver, nextDir, rawStops)
        }

      } catch (loopErr) {
        console.error(`Driver ${driverId} loop error (non-fatal):`, loopErr)
      }
    }, TICK_MS)

    activeSimulations.set(driverId, simDriver)

    console.log(
      `\n✓ Simulation v3.2 started for driver ${driverId}` +
      `\n  Route ${driver.route_id} (${routeName}) | ${waypoints.length} waypoints | ${totalRouteKm.toFixed(1)} km` +
      `\n  Speed multiplier: ${speedMultiplier}x | ${metresPerTick}m/tick @ ${TICK_MS}ms` +
      `\n  One-way leg: ~${Math.round(secondsPerLeg / 60)}m ${secondsPerLeg % 60}s` +
      `\n  DB stops mapped: ${stopProximityMap.size}`
    )

    return {
      success: true,
      message: `Simulation started. One-way leg: ~${Math.round(secondsPerLeg / 60)}m ${secondsPerLeg % 60}s.`,
    }
  } catch (error) {
    console.error('startSimulation error:', error)
    return { success: false, message: 'Failed to start simulation' }
  }
}

// ─── Public exports ───────────────────────────────────────────────────────────

export const markPassengerPaid = (driverId: number, passengerId: number): void => {
  const sim = activeSimulations.get(driverId)
  if (!sim) return
  const p = sim.onboardPassengers.find(p => p.passengerId === passengerId)
  if (p) {
    p.paidViaMpesa = true
    getIO().emit(`driver:${driverId}:payment_received`, {
      passenger_id: passengerId, passenger_name: p.passengerName,
      trip_id: p.tripId, fare: p.fare,
    })
  }
}

export const getRouteWaypoints = async (
  routeId: number
): Promise<{ lat: number; lng: number; name: string }[]> => {
  const r = await query(
    'SELECT lat, lng, name FROM stops WHERE route_id=$1 ORDER BY order_index', [routeId]
  )
  if (r.rows.length < 2) return []
  return buildRoadWaypoints(
    routeId,
    r.rows.map((s: any) => ({ lat: parseFloat(s.lat), lng: parseFloat(s.lng), name: s.name }))
  ) as any
}

export const isSimulationActive   = (driverId: number): boolean => activeSimulations.has(driverId)
export const getOnboardPassengers = (driverId: number): OnboardPassenger[] =>
  activeSimulations.get(driverId)?.onboardPassengers ?? []

export const stopAllSimulations = async (): Promise<void> => {
  const ids = Array.from(activeSimulations.keys())
  for (const id of ids) {
    stopSimulation(id)
    await query('UPDATE driver_profiles SET is_active=false WHERE user_id=$1', [id]).catch(() => {})
  }
  console.log(`Stopped ${ids.length} simulations`)
}

export const getSimulationStatus = (): object => {
  const status: Record<string, any> = {}
  activeSimulations.forEach((sim, driverId) => {
    const current = sim.waypoints[sim.currentIndex]
    status[driverId] = {
      driverId,
      routeId:         sim.routeId,
      plateNumber:     sim.plateNumber,
      driverName:      sim.driverName,
      direction:       sim.direction,
      currentIndex:    sim.currentIndex,
      totalWaypoints:  sim.totalWaypoints,
      progressPercent: Math.round((sim.currentIndex / sim.totalWaypoints) * 100),
      currentPosition: current ? { lat: current.lat, lng: current.lng } : null,
      currentSpeedKph: sim.currentSpeedKph,
      isRunning:       sim.timer !== null,
      isWaiting:       sim.isWaiting,
      passengerCount:  sim.passengerCount,
      onboard_count:   sim.onboardPassengers.length,
      onboard_passengers: sim.onboardPassengers.map(p => ({
        passenger_id:    p.passengerId,
        name:            p.passengerName,
        destination:     p.destinationStopName,
        boarded_at_stop: p.boardedAtStop,
        paid_via_mpesa:  p.paidViaMpesa,
        payment_display: p.paidViaMpesa ? '✓ M-Pesa' : '⏳ Cash',
        is_virtual:      p.isVirtual,
        fare:            p.fare,
        trip_id:         p.tripId,
      })),
      virtualWaiting:  sim.virtualWaiting.length,
    }
  })
  return status
}