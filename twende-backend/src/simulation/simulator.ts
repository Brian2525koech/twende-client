// src/simulation/simulator.ts
//
// ═══════════════════════════════════════════════════════════════════════════════
// TWENDE SIMULATION ENGINE v3.0  —  Realistic Movement
// ═══════════════════════════════════════════════════════════════════════════════
//
// WHAT CHANGED FROM v2.0:
//
// ── Movement ──────────────────────────────────────────────────────────────────
// v2 moved one OSRM waypoint per tick at 100ms = marker teleporting.
// v3 uses a STEP-BUDGET system: each tick the matatu advances as many
//    waypoints as needed to cover a fixed real-world distance (e.g. 15m),
//    then broadcasts ONE position update. This produces smooth, steady
//    movement on the map at a believable speed regardless of how densely
//    OSRM packed the waypoints.
//
// ── Speed ─────────────────────────────────────────────────────────────────────
// v2 hardcoded speed = 40 km/h always.
// v3 computes the actual metres covered per tick interval and converts to
//    km/h — so the badge shows a realistic fluctuating speed (25-55 km/h)
//    that slows near stops and when waiting.
//
// ── Passengers ────────────────────────────────────────────────────────────────
// v2 destinations were only 15 waypoints away → passengers alighted in ~1.5s.
// v3 enforces a MINIMUM_RIDE_DISTANCE_KM (0.8 km) so passengers always ride
//    for a meaningful stretch. Boarding pauses are 8-15 real seconds.
//    Alighting announcements arrive well before the stop.
//
// ── Spawn pacing ──────────────────────────────────────────────────────────────
// v2 spawned passengers every ~⅛ of route which was too frequent.
// v3 spawns 1-2 passengers every MIN_SPAWN_DISTANCE_KM (1.5 km) of travel,
//    so the map never looks like a video game.
//
// ═══════════════════════════════════════════════════════════════════════════════

import { query } from '../config/db'
import { calculateETA, haversineDistance } from '../utils/haversine'
import { getFullRoutePath } from '../utils/osrm'
import { getCachedRoute, setCachedRoute } from '../utils/routeCache'
import { getIO } from '../socket'
import { sendNotification } from '../utils/notificationHelper'

// ─── Simulation constants ─────────────────────────────────────────────────────

/**
 * How often the simulation loop fires, in ms.
 * This does NOT equal how often the marker moves — the step budget controls that.
 * Keep this at 800ms so the server isn't hammered and socket messages are
 * readable on the client (Leaflet animates between positions smoothly).
 */
const TICK_MS = 800

/**
 * How far the matatu travels per tick in kilometres, at "normal" city speed.
 * 0.012 km = 12 metres per tick at 800ms ≈ 54 km/h — realistic for open road.
 * Near stops or when idle, this is reduced.
 */
const METRES_PER_TICK = 12   // metres the matatu covers each 800ms tick

/**
 * Minimum ride distance for virtual passengers, in km.
 * Prevents passengers from boarding and alighting within seconds.
 */
const MIN_RIDE_KM = 0.8

/**
 * How many boarding stops to make per one-way leg.
 * Passengers are pre-planned at start of each leg and spread evenly.
 * 6 stops × ~8s pause = ~48s of stopping per leg — realistic.
 */
const STOPS_PER_LEG = 6

/**
 * Minimum distance between virtual passenger spawns, in km.
 * Only used as a safety floor — primary control is STOPS_PER_LEG.
 */
const MIN_SPAWN_KM = 99999  // disabled — we use pre-planned stops now

/**
 * How many ticks (× TICK_MS) the matatu pauses at a boarding stop.
 * 10 ticks × 800ms = 8 seconds — you can see it stop and wait.
 */
const BOARDING_PAUSE_TICKS = 10

/**
 * How many waypoints ahead to warn a passenger before they alight.
 * This fires the "prepare to alight" notification.
 */
const ALIGHT_WARN_WAYPOINTS = 8

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
  alightWarned:        boolean   // true once we've sent the "prepare to alight" notice
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
  plateNumber:     string
  driverName:      string
  averageRating:   number
  profileImageUrl: string | null
  capacity:        number

  waypoints:    { lat: number; lng: number }[]
  currentIndex: number
  direction:    SimDirection
  timer:        NodeJS.Timeout | null

  // Speed tracking
  lastBroadcastLat: number
  lastBroadcastLng: number
  currentSpeedKph:  number    // computed from actual movement each tick

  // Waiting / boarding state
  isWaiting:    boolean
  pauseCounter: number
  pauseLimit:   number        // ticks to wait (BOARDING_PAUSE_TICKS)

  // Background passenger count (non-tracked, for display only)
  passengerCount: number

  onboardPassengers: OnboardPassenger[]
  virtualWaiting:    VirtualWaitingPassenger[]

  // DB stop triggers
  stopProximityMap:     Map<number, number>   // stopId → nearest waypoint idx
  triggeredStopIndices: Set<number>

  // Pre-planned boarding stop indices for this leg (STOPS_PER_LEG evenly spread)
  plannedStopIndices:    number[]
  stopsUsedThisLeg:      Set<number>  // which planned stops already triggered

  // Spawn tracking (kept for safety floor)
  kmSinceLastSpawn: number
  virtualPassengerIdSeq: number

  totalWaypoints: number
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

// ─── Find nearest waypoint index ─────────────────────────────────────────────

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

// ─── Build stop proximity map ─────────────────────────────────────────────────

const buildStopProximityMap = (
  stops: { id: number; lat: number; lng: number; name: string }[],
  path:  { lat: number; lng: number }[]
): Map<number, number> => {
  const map = new Map<number, number>()
  for (const stop of stops.slice(1, -1)) {
    const idx  = findNearestWaypointIndex(stop.lat, stop.lng, path)
    const dist = haversineDistance(stop.lat, stop.lng, path[idx].lat, path[idx].lng)
    if (dist < 0.5) {
      map.set(stop.id, idx)
      console.log(`  Stop "${stop.name}" → idx ${idx} (${(dist * 1000).toFixed(0)}m)`)
    } else {
      console.warn(`  Stop "${stop.name}" ${(dist * 1000).toFixed(0)}m from road — skipped`)
    }
  }
  return map
}

// ─── Directionality helpers ───────────────────────────────────────────────────

const isAhead = (currentIdx: number, targetIdx: number, dir: SimDirection): boolean =>
  dir === 'forward' ? targetIdx > currentIdx : targetIdx < currentIdx

const PROXIMITY_WINDOW = 6

const isNearIndex = (a: number, b: number): boolean =>
  Math.abs(a - b) <= PROXIMITY_WINDOW

// ─── Fare estimate ────────────────────────────────────────────────────────────

const estimateFare = (
  waypoints: { lat: number; lng: number }[],
  fromIdx: number, toIdx: number
): number => {
  const a = waypoints[fromIdx], b = waypoints[toIdx]
  if (!a || !b) return 50
  return Math.max(30, Math.round(30 + haversineDistance(a.lat, a.lng, b.lat, b.lng) * 8))
}

// ─── Find a destination index that is at least MIN_RIDE_KM ahead ──────────────

const findDestinationAhead = (
  sim:      SimulatedDriver,
  fromIdx:  number,
): number | null => {
  const path = sim.waypoints
  const total = path.length

  if (sim.direction === 'forward') {
    // Walk forward from fromIdx until we've covered MIN_RIDE_KM
    let dist = 0
    let i    = fromIdx
    while (i < total - 1) {
      dist += haversineDistance(path[i].lat, path[i].lng, path[i+1].lat, path[i+1].lng)
      i++
      if (dist >= MIN_RIDE_KM) break
    }
    // Need at least MIN_RIDE_KM of road ahead
    if (i >= total - 2) return null
    // Pick a random destination between minDist and 80% of remaining
    const destMax = Math.min(total - 1, i + Math.floor((total - i) * 0.6))
    return destMax > i ? randomInt(i, destMax) : null
  } else {
    // Backward direction
    let dist = 0
    let i    = fromIdx
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

// ─── Advance waypoint index by a real-world distance budget ──────────────────
//
// Instead of moving one waypoint per tick (which causes jerky jumps when
// OSRM waypoints are close together), we advance as many indices as needed
// to cover METRES_PER_TICK worth of road, then stop and broadcast.
// This produces steady, realistic movement regardless of waypoint density.
//
// Returns: { newIndex, metresCovered }

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
      const step = haversineDistance(
        path[idx].lat, path[idx].lng,
        path[idx + 1].lat, path[idx + 1].lng
      )
      covered += step
      idx++
    }
    if (idx >= total - 1) hitEnd = true
  } else {
    while (idx > 0 && covered < targetMetres / 1000) {
      const step = haversineDistance(
        path[idx].lat, path[idx].lng,
        path[idx - 1].lat, path[idx - 1].lng
      )
      covered += step
      idx--
    }
    if (idx <= 0) hitEnd = true
  }

  return { newIndex: idx, metresCovered: covered * 1000, hitEnd }
}

// ─── Compute current speed from actual movement ───────────────────────────────

const computeSpeed = (
  sim:    SimulatedDriver,
  metresCovered: number
): number => {
  // speed (km/h) = distance (km) / time (hours)
  const distKm   = metresCovered / 1000
  const timeHrs  = TICK_MS / 3_600_000
  const raw      = distKm / timeHrs
  // Smooth with previous speed (exponential moving average, α=0.4)
  const smoothed = sim.currentSpeedKph * 0.6 + raw * 0.4
  return Math.round(Math.min(80, Math.max(0, smoothed)))
}

// ─── Stop simulation ──────────────────────────────────────────────────────────

export const stopSimulation = (driverId: number): void => {
  const sim = activeSimulations.get(driverId)
  if (sim?.timer) { clearInterval(sim.timer); sim.timer = null }
  activeSimulations.delete(driverId)
  query(
    'UPDATE driver_profiles SET is_active = false WHERE user_id = $1',
    [driverId]
  ).catch(() => {})
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

// ─── Broadcast position update ────────────────────────────────────────────────

const broadcastUpdate = (
  sim: SimulatedDriver, rawStops: any[]
): void => {
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
}

// ─── Check alighting ──────────────────────────────────────────────────────────

const checkAlighting = async (sim: SimulatedDriver): Promise<void> => {
  if (sim.onboardPassengers.length === 0) return

  // 1. Send advance warning to passengers close to their stop
  for (const p of sim.onboardPassengers) {
    if (!p.alightWarned) {
      const dist = Math.abs(sim.currentIndex - p.destinationPathIdx)
      if (dist <= ALIGHT_WARN_WAYPOINTS && isAhead(p.destinationPathIdx, sim.currentIndex, sim.direction) === false) {
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

  // 2. Actually alight passengers who have reached their stop
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
      getIO().emit(`driver:${sim.driverId}:passenger_alighted`, {
        trip_id: null, passenger_name: p.passengerName,
        payment_status: p.paidViaMpesa ? 'paid' : 'cash_pending',
        fare: p.fare, is_virtual: true,
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
    // ── Capacity check — never exceed the vehicle's limit ───────────────────
    const occupied = sim.passengerCount + sim.onboardPassengers.length
    if (occupied >= sim.capacity) {
      // Remove from waiting — full matatu can't pick anyone up
      sim.virtualWaiting = sim.virtualWaiting.filter(w => w.id !== vp.id)
      console.log(`  Full (${occupied}/${sim.capacity}) — ${vp.name} not boarded`)
      continue
    }

    const fare = estimateFare(sim.waypoints, vp.pathIdx, vp.destinationIdx)
    const onboard: OnboardPassenger = {
      waitingId:           null,
      passengerId:         null,
      passengerName:       vp.name,
      boardedAtStop:       `Road Stop`,
      boardedAtPathIdx:    vp.pathIdx,
      destinationStopName: vp.destinationName,
      destinationPathIdx:  vp.destinationIdx,
      tripId:              null,
      paidViaMpesa:        Math.random() < 0.35,
      isVirtual:           true,
      fare,
      alightWarned:        false,
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
    })
    console.log(`  ✓ [Virtual] ${vp.name} boarded → ${vp.destinationName} | KSh ${fare}`)
  }

  return true
}

// ─── Check real DB passenger pickups ─────────────────────────────────────────

const checkRealPickups = async (
  sim: SimulatedDriver, rawStops: any[]
): Promise<boolean> => {
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

    // Mark indices triggered regardless — prevents repeat DB queries
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
      })

      await sendNotification({
        userId: row.passenger_id, title: "You're on board! 🚌",
        message: `You have boarded ${sim.plateNumber}. Heading to ${row.destination_name ?? 'your destination'}. Fare: KSh ${fare}.`,
        type: 'trip',
        socketEvent: `passenger:${row.passenger_id}:boarded`,
        socketData: { trip_id: tripId, plate: sim.plateNumber, destination: row.destination_name, driver_name: sim.driverName, fare },
      })

      getIO().emit(`driver:${sim.driverId}:passenger_boarded`, {
        passenger_name: row.passenger_name, stop: stopName,
        destination: row.destination_name ?? 'Unknown',
        trip_id: tripId, fare, is_virtual: false, payment_display: '⏳ Cash',
      })

      didStop = true
      console.log(`  ✓ [Real] ${row.passenger_name} boarded at "${stopName}"`)
    }

    return didStop
  } catch (e: any) {
    console.error('checkRealPickups:', e.message)
    return false
  }
}

// ─── Plan evenly-spaced boarding stops for a leg ─────────────────────────────
//
// Instead of spawning passengers based on distance travelled (which causes
// unpredictable clustering), we pre-compute exactly STOPS_PER_LEG indices
// spread evenly across the upcoming leg, then place one virtual passenger
// at each index. This guarantees the matatu stops 5-8 times per leg, no more.

const planLegStops = (sim: SimulatedDriver): void => {
  const total = sim.totalWaypoints
  const start = sim.direction === 'forward' ? sim.currentIndex : 0
  const end   = sim.direction === 'forward' ? total - 1 : sim.currentIndex

  // Guard: need room for at least 2 stops
  if (Math.abs(end - start) < 40) return

  const step = Math.floor(Math.abs(end - start) / (STOPS_PER_LEG + 1))
  const indices: number[] = []

  for (let i = 1; i <= STOPS_PER_LEG; i++) {
    const idx = sim.direction === 'forward'
      ? start + step * i
      : start - step * i
    // Keep in bounds and add some jitter (±5 waypoints) so stops don't look robotic
    const jitter  = randomInt(-5, 5)
    const bounded = Math.max(1, Math.min(total - 2, idx + jitter))
    indices.push(bounded)
  }

  sim.plannedStopIndices = indices
  sim.stopsUsedThisLeg   = new Set()

  console.log(`  Planned ${indices.length} boarding stops for this leg`)
}

// ─── Check if matatu is at a planned stop and spawn a waiting passenger ───────

const checkPlannedStops = (sim: SimulatedDriver): void => {
  for (const stopIdx of sim.plannedStopIndices) {
    // Already used this stop
    if (sim.stopsUsedThisLeg.has(stopIdx)) continue

    // Not near this stop yet
    if (!isNearIndex(sim.currentIndex, stopIdx)) continue

    // Mark as used immediately so we don't re-trigger
    sim.stopsUsedThisLeg.add(stopIdx)

    // Check capacity — only spawn if there's room
    const occupied = sim.passengerCount + sim.onboardPassengers.length
    if (occupied >= sim.capacity) {
      console.log(`  Planned stop idx=${stopIdx} skipped — matatu full (${occupied}/${sim.capacity})`)
      continue
    }

    const boardWp = sim.waypoints[stopIdx]
    if (!boardWp) continue

    // Find a destination at least MIN_RIDE_KM ahead
    const destIdx = findDestinationAhead(
      { ...sim, currentIndex: stopIdx } as SimulatedDriver,
      stopIdx
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
  const count = randomInt(1, 2)   // max 2 at a time — don't flood the map

  for (let i = 0; i < count; i++) {
    // Find a boarding point at least 20 waypoints ahead
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

    // Find a destination at least MIN_RIDE_KM further ahead
    const destIdx = findDestinationAhead(
      { ...sim, currentIndex: boardIdx } as SimulatedDriver,
      boardIdx
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

// ─── Handle terminus: alight everyone, pause, then turn around ───────────────

const handleReversal = async (
  sim:    SimulatedDriver,
  newDir: SimDirection,
  rawStops: any[]
): Promise<void> => {
  console.log(`Driver ${sim.driverId}: reached terminus — alighting all passengers`)

  // 1. Alight every onboard passenger at terminus
  for (const p of sim.onboardPassengers) {
    const terminusName = newDir === 'backward'
      ? (rawStops[rawStops.length - 1]?.name ?? 'End Terminus')
      : (rawStops[0]?.name ?? 'Start Terminus')

    if (!p.isVirtual && p.tripId && p.passengerId) {
      getIO().emit(`passenger:${p.passengerId}:alighting`, {
        trip_id:     p.tripId,
        destination: terminusName,
        fare:        p.fare,
        message:     `You have reached the terminus (${terminusName}). Thank you for riding with Twende!`,
      })
      await sendNotification({
        userId:  p.passengerId,
        title:   "Terminus reached! 📍",
        message: `You have reached ${terminusName}. Please alight from ${sim.plateNumber}.`,
        type:    'trip',
      })
      await completeTrip(p.tripId, p.passengerId, sim.driverId, p.paidViaMpesa, p.fare)
    } else if (p.isVirtual) {
      getIO().emit(`driver:${sim.driverId}:passenger_alighted`, {
        trip_id: null, passenger_name: p.passengerName,
        payment_status: p.paidViaMpesa ? 'paid' : 'cash_pending',
        fare: p.fare, is_virtual: true,
      })
    }
  }

  // 2. Clear everyone — matatu is empty at terminus
  sim.onboardPassengers = []
  sim.passengerCount    = 0    // reset background count too

  // 3. Pause at terminus for boarding (longer pause = loading time)
  sim.isWaiting    = true
  sim.pauseCounter = 0
  sim.pauseLimit   = BOARDING_PAUSE_TICKS + 8  // ~14s at terminus

  // 4. Set new direction and clear state for next leg
  sim.direction    = newDir
  sim.triggeredStopIndices.clear()
  sim.virtualWaiting     = []
  sim.kmSinceLastSpawn   = 0

  // 5. Pre-plan stops for the next leg
  planLegStops(sim)

  // 6. Seed 1-2 initial passengers for the new leg
  spawnVirtualPassengers(sim)

  // 7. Broadcast direction change
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

  console.log(`Driver ${sim.driverId}: terminus cleared → now heading ${newDir}`)
}

// ─── START SIMULATION ─────────────────────────────────────────────────────────

export const startSimulation = async (
  driverId: number,
  speedMultiplier: number = 1
): Promise<{ success: boolean; message: string }> => {
  try {
    if (activeSimulations.has(driverId)) stopSimulation(driverId)

    // ── Load driver ──────────────────────────────────────────────────────────
    const driverResult = await query(
      `SELECT dp.*, u.name AS driver_name, u.profile_image_url
       FROM driver_profiles dp JOIN users u ON u.id = dp.user_id
       WHERE dp.user_id = $1`,
      [driverId]
    )
    if (driverResult.rows.length === 0) return { success: false, message: 'Driver not found' }
    const driver = driverResult.rows[0]

    // ── Load stops ───────────────────────────────────────────────────────────
    const stopsResult = await query(
      'SELECT id, name, lat, lng, order_index FROM stops WHERE route_id=$1 ORDER BY order_index',
      [driver.route_id]
    )
    if (stopsResult.rows.length < 2) return { success: false, message: 'Route needs at least 2 stops' }

    const rawStops   = stopsResult.rows
    const stopPoints = rawStops.map((s: any) => ({
      id: s.id, lat: parseFloat(s.lat), lng: parseFloat(s.lng), name: s.name,
    }))

    // ── Build OSRM path ──────────────────────────────────────────────────────
    console.log(`\nBuilding road path: "${stopPoints[0].name}" → "${stopPoints[stopPoints.length - 1].name}"`)
    const waypoints = await buildRoadWaypoints(
      driver.route_id,
      stopPoints.map(s => ({ lat: s.lat, lng: s.lng, name: s.name }))
    )
    if (waypoints.length < 2) return { success: false, message: 'Could not build route waypoints' }

    console.log('Building stop proximity indices:')
    const stopProximityMap = buildStopProximityMap(stopPoints, waypoints)

    // ── Speed calibration ────────────────────────────────────────────────────
    //
    // speedMultiplier is a 1-10 scale from the admin panel:
    //   1  = real time (slow demo, good for presentations)
    //   5  = default (moderate pace)
    //   10 = fast (stress testing)
    //
    // We scale METRES_PER_TICK by this multiplier.
    // At multiplier=1: 12m/tick × 1 = ~54 km/h apparent speed → realistic
    // At multiplier=5: 12m/tick × 5 = ~270 km/h apparent → fast demo
    //
    // The tick interval stays fixed at TICK_MS (800ms) always,
    // so the map updates at a steady readable rate regardless of speed.

    const metresPerTick = METRES_PER_TICK * Math.max(1, Math.min(10, speedMultiplier))

    // Estimate full lap duration
    let totalRouteKm = 0
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalRouteKm += haversineDistance(
        waypoints[i].lat, waypoints[i].lng,
        waypoints[i+1].lat, waypoints[i+1].lng
      )
    }
    const ticksPerLeg = Math.ceil((totalRouteKm * 1000) / metresPerTick)
    const secondsPerLeg = Math.ceil((ticksPerLeg * TICK_MS) / 1000)

    const simDriver: SimulatedDriver = {
      driverId,
      routeId:          driver.route_id,
      plateNumber:      driver.plate_number,
      driverName:       driver.driver_name,
      averageRating:    parseFloat(driver.average_rating) || 0,
      profileImageUrl:  driver.profile_image_url,
      capacity:         driver.capacity || 14,

      waypoints,
      currentIndex:     0,
      direction:        'forward',
      timer:            null,

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
    }

    // Plan initial leg stops and seed first passengers
    planLegStops(simDriver)
    spawnVirtualPassengers(simDriver)

    // ── Main loop ────────────────────────────────────────────────────────────
    simDriver.timer = setInterval(async () => {
      try {
        const current = simDriver.waypoints[simDriver.currentIndex]
        if (!current) { simDriver.currentIndex = 0; return }

        // ── Waiting at boarding stop ─────────────────────────────────────────
        if (simDriver.isWaiting) {
          simDriver.pauseCounter++
          simDriver.currentSpeedKph = 0
          broadcastUpdate(simDriver, rawStops)

          if (simDriver.pauseCounter >= simDriver.pauseLimit) {
            simDriver.isWaiting    = false
            simDriver.pauseCounter = 0
            // Small random change in background passenger count
            const delta = randomInt(-1, 2)
            simDriver.passengerCount = Math.max(
              0, Math.min(simDriver.capacity, simDriver.passengerCount + delta)
            )
          }
          return
        }

        // ── Check alighting ──────────────────────────────────────────────────
        await checkAlighting(simDriver)

        // ── Check pickups ────────────────────────────────────────────────────
        const pickedVirtual = await checkVirtualPickups(simDriver)
        const pickedReal    = await checkRealPickups(simDriver, rawStops)

        if (pickedVirtual || pickedReal) {
          simDriver.isWaiting    = true
          simDriver.pauseCounter = 0
          simDriver.pauseLimit   = pickedReal ? BOARDING_PAUSE_TICKS + 5 : BOARDING_PAUSE_TICKS
          broadcastUpdate(simDriver, rawStops)
          return
        }

        // ── Advance by distance budget ───────────────────────────────────────
        const { newIndex, metresCovered, hitEnd } = advanceByDistance(
          simDriver, metresPerTick
        )

        simDriver.currentSpeedKph = computeSpeed(simDriver, metresCovered)
        simDriver.kmSinceLastSpawn += metresCovered / 1000
        simDriver.currentIndex = newIndex

        // ── Check planned stops (places a waiting passenger on map) ──────────
        checkPlannedStops(simDriver)

        // ── Broadcast position ───────────────────────────────────────────────
        broadcastUpdate(simDriver, rawStops)

        // ── DB position update (fire-and-forget) ─────────────────────────────
        const pos = simDriver.waypoints[simDriver.currentIndex]
        if (pos) {
          query(
            `UPDATE driver_profiles SET last_lat=$1, last_lng=$2, is_active=true, updated_at=NOW() WHERE user_id=$3`,
            [pos.lat, pos.lng, driverId]
          ).catch((e: Error) => console.error('DB pos update failed:', e.message))
        }

        // ── Handle terminus ──────────────────────────────────────────────────
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
      `\n✓ Simulation v3.0 started for driver ${driverId}` +
      `\n  Route ${driver.route_id} | ${waypoints.length} waypoints | ${totalRouteKm.toFixed(1)} km` +
      `\n  Speed multiplier: ${speedMultiplier}x | ${metresPerTick}m/tick @ ${TICK_MS}ms` +
      `\n  One-way leg: ~${Math.round(secondsPerLeg / 60)}m ${secondsPerLeg % 60}s` +
      `\n  Passenger spawn every: ${MIN_SPAWN_KM} km` +
      `\n  DB stops mapped: ${stopProximityMap.size}`
    )

    return {
      success: true,
      message: `Simulation started. One-way leg: ~${Math.round(secondsPerLeg / 60)}m ${secondsPerLeg % 60}s. Matatu will reverse at terminus.`,
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
      speedMultiplier: 1,   // v3 uses metresPerTick scale, not this field
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
      })),
      virtualWaiting:  sim.virtualWaiting.length,
    }
  })
  return status
}