// src/controllers/simulationController.ts
//
// ═══════════════════════════════════════════════════════════════════════════════
// TWENDE SIMULATION CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════════
//
// Shared endpoints used by DRIVER, PASSENGER, and ADMIN to interact with the
// running simulation.  Admin-only heavy actions (start/stop/stop-all) remain
// in adminController.ts — this file handles the read + personal-action layer.
//
// Routes (mounted at /api/sim by the router):
//
//   GET  /api/sim/active                   → all currently active matatus (passenger map)
//   GET  /api/sim/route/:route_id          → active matatus on one route
//   GET  /api/sim/driver/:driver_id        → live state for one driver (driver dashboard)
//   GET  /api/sim/driver/:driver_id/status → is driver simulation running?
//   POST /api/sim/passenger/waiting        → mark self as waiting (passenger)
//   DELETE /api/sim/passenger/waiting      → cancel waiting (passenger)
//   GET  /api/sim/passenger/:passenger_id/trip → current ongoing trip for a passenger
//   POST /api/sim/driver/:driver_id/pay    → driver marks a passenger as cash-paid
// ═══════════════════════════════════════════════════════════════════════════════

import { Request, Response } from 'express'
import { query } from '../config/db'
import { getIO } from '../socket'
import {
  isSimulationActive,
  getSimulationStatus,
  getOnboardPassengers,
} from '../simulation/simulator'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sim/active
// Returns all currently running simulations — used by passenger map to show
// every live matatu on the map at once.
// Auth: any logged-in user
// ─────────────────────────────────────────────────────────────────────────────
export const getActiveSimulations = (_req: Request, res: Response): void => {
  try {
    const status = getSimulationStatus() as Record<string, any>
    const active = Object.values(status).filter((s: any) => s.isRunning)
    res.status(200).json({
      count:    active.length,
      matatus:  active,
    })
  } catch (err) {
    console.error('getActiveSimulations error:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sim/route/:route_id
// Active matatus on a specific route — passenger picks the route and sees
// only the matatus relevant to them.
// Auth: any logged-in user
// ─────────────────────────────────────────────────────────────────────────────
export const getActiveSimulationsForRoute = async (req: Request, res: Response): Promise<void> => {
  const routeId = parseInt(req.params.route_id as string, 10)
  if (isNaN(routeId)) { res.status(400).json({ message: 'Invalid route_id' }); return }

  try {
    const status = getSimulationStatus() as Record<string, any>

    const onRoute = Object.values(status)
      .filter((s: any) => s.isRunning && s.routeId === routeId)

    // Also pull DB stops so frontend can render them alongside the matatus
    const stopsResult = await query(
      'SELECT id, name, lat, lng, order_index FROM stops WHERE route_id = $1 ORDER BY order_index',
      [routeId]
    )

    res.status(200).json({
      route_id: routeId,
      count:    onRoute.length,
      matatus:  onRoute,
      stops:    stopsResult.rows,
    })
  } catch (err) {
    console.error('getActiveSimulationsForRoute error:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sim/driver/:driver_id
// Full live state for a single driver — used by the driver's own dashboard to
// show their current passengers, direction, speed, and upcoming stops.
// Auth: driver (their own id) or admin
// ─────────────────────────────────────────────────────────────────────────────
export const getDriverSimState = async (req: Request, res: Response): Promise<void> => {
  const driverId = parseInt(req.params.driver_id as string, 10)
  if (isNaN(driverId)) { res.status(400).json({ message: 'Invalid driver_id' }); return }

  try {
    const active = isSimulationActive(driverId)

    if (!active) {
      // Return DB last-known position so the dashboard isn't blank
      const dbResult = await query(
        `SELECT dp.last_lat, dp.last_lng, dp.plate_number, dp.route_id,
                dp.is_active, dp.average_rating, dp.capacity,
                u.name AS driver_name, u.profile_image_url
         FROM   driver_profiles dp
         JOIN   users u ON u.id = dp.user_id
         WHERE  dp.user_id = $1`,
        [driverId]
      )
      if (dbResult.rows.length === 0) {
        res.status(404).json({ message: 'Driver not found' }); return
      }
      const d = dbResult.rows[0]
      res.status(200).json({
        simulation_active: false,
        driver_id:         driverId,
        driver_name:       d.driver_name,
        plate_number:      d.plate_number,
        route_id:          d.route_id,
        average_rating:    parseFloat(d.average_rating) || 0,
        capacity:          d.capacity,
        last_lat:          d.last_lat ? parseFloat(d.last_lat) : null,
        last_lng:          d.last_lng ? parseFloat(d.last_lng) : null,
        current_passengers: [],
        onboard_count:     0,
      })
      return
    }

    const statusMap = getSimulationStatus() as Record<string, any>
    const sim       = statusMap[driverId]
    const passengers = getOnboardPassengers(driverId)

    res.status(200).json({
      simulation_active:  true,
      ...sim,
      onboard_count:      passengers.length,
      current_passengers: passengers.map(p => ({
        passenger_name:  p.passengerName,
        boarded_at_stop: p.boardedAtStop,
        destination:     p.destinationStopName,
        trip_id:         p.tripId,
        paid_via_mpesa:  p.paidViaMpesa,
        payment_display: p.paidViaMpesa ? '✓ M-Pesa' : '⏳ Cash',
        is_virtual:      p.isVirtual,
        fare:            p.fare,
      })),
    })
  } catch (err) {
    console.error('getDriverSimState error:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sim/driver/:driver_id/status
// Lightweight ping — is this driver's simulation running?
// Used by driver dashboard on mount to decide whether to show "Start sim" CTA.
// Auth: driver (their own id) or admin
// ─────────────────────────────────────────────────────────────────────────────
export const getDriverSimStatus = (req: Request, res: Response): void => {
  const driverId = parseInt(req.params.driver_id as string, 10)
  if (isNaN(driverId)) { res.status(400).json({ message: 'Invalid driver_id' }); return }

  res.status(200).json({
    driver_id:         driverId,
    simulation_active: isSimulationActive(driverId),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sim/passenger/waiting
// Passenger marks themselves as waiting at a stop on a route.
// The simulator picks them up when the matatu reaches their stop AND their
// destination is ahead in the matatu's current direction.
//
// Body: { route_id, stop_id, destination_stop_id? }
// Auth: passenger (req.user.id from JWT middleware)
// ─────────────────────────────────────────────────────────────────────────────
export const markPassengerWaiting = async (req: Request, res: Response): Promise<void> => {
  // req.user is set by your JWT auth middleware
  const passengerId = (req as any).user?.id
  if (!passengerId) { res.status(401).json({ message: 'Unauthorised' }); return }

  const { route_id, stop_id, destination_stop_id } = req.body
  if (!route_id || !stop_id) {
    res.status(400).json({ message: 'route_id and stop_id are required' }); return
  }

  try {
    // Cancel any existing active waiting record for this passenger
    await query(
      `UPDATE waiting_passengers
       SET status = 'cancelled'
       WHERE passenger_id = $1 AND status IN ('waiting', 'accepted')`,
      [passengerId]
    )

    // Validate stop belongs to route
    const stopCheck = await query(
      'SELECT id, name, lat, lng FROM stops WHERE id = $1 AND route_id = $2',
      [stop_id, route_id]
    )
    if (stopCheck.rows.length === 0) {
      res.status(400).json({ message: 'Stop does not belong to this route' }); return
    }
    const stop = stopCheck.rows[0]

    // Insert new waiting record (expires in 30 min per schema default)
    const result = await query(
      `INSERT INTO waiting_passengers
         (passenger_id, route_id, stop_id, destination_stop_id, status)
       VALUES ($1, $2, $3, $4, 'waiting')
       RETURNING id, expires_at`,
      [passengerId, route_id, stop_id, destination_stop_id || null]
    )

    const waiting = result.rows[0]

    // Fetch destination name for the response
    let destinationName: string | null = null
    if (destination_stop_id) {
      const destRes = await query('SELECT name FROM stops WHERE id = $1', [destination_stop_id])
      destinationName = destRes.rows[0]?.name ?? null
    }

    // Notify all active matatu drivers on this route via socket
    // so their map shows a new waiting passenger
    const simStatus = getSimulationStatus() as Record<string, any>
    Object.values(simStatus)
      .filter((s: any) => s.isRunning && s.routeId === Number(route_id))
      .forEach((s: any) => {
        try {
          getIO().emit(`driver:${s.driverId}:new_waiting_passenger`, {
            waiting_id:       waiting.id,
            stop_name:        stop.name,
            stop_lat:         parseFloat(stop.lat),
            stop_lng:         parseFloat(stop.lng),
            destination_name: destinationName,
            expires_at:       waiting.expires_at,
          })
        } catch (_) {}
      })

    res.status(201).json({
      message:          'You are now marked as waiting. A matatu will pick you up shortly.',
      waiting_id:       waiting.id,
      stop_name:        stop.name,
      stop_lat:         parseFloat(stop.lat),
      stop_lng:         parseFloat(stop.lng),
      destination_name: destinationName,
      expires_at:       waiting.expires_at,
    })
  } catch (err) {
    console.error('markPassengerWaiting error:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/sim/passenger/waiting
// Passenger cancels their waiting request.
// Auth: passenger (req.user.id)
// ─────────────────────────────────────────────────────────────────────────────
export const cancelPassengerWaiting = async (req: Request, res: Response): Promise<void> => {
  const passengerId = (req as any).user?.id
  if (!passengerId) { res.status(401).json({ message: 'Unauthorised' }); return }

  try {
    const result = await query(
      `UPDATE waiting_passengers
       SET status = 'cancelled'
       WHERE passenger_id = $1 AND status IN ('waiting', 'accepted')
       RETURNING id`,
      [passengerId]
    )

    if (result.rowCount === 0) {
      res.status(200).json({ message: 'No active waiting request to cancel' }); return
    }

    res.status(200).json({ message: 'Waiting request cancelled', cancelled_id: result.rows[0].id })
  } catch (err) {
    console.error('cancelPassengerWaiting error:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sim/passenger/:passenger_id/trip
// Returns the current ongoing trip for a passenger — used by the passenger's
// live trip screen to show fare, driver, destination, etc.
// Auth: passenger (their own id) or admin
// ─────────────────────────────────────────────────────────────────────────────
export const getPassengerCurrentTrip = async (req: Request, res: Response): Promise<void> => {
  const passengerId = parseInt(req.params.passenger_id as string, 10)
  if (isNaN(passengerId)) { res.status(400).json({ message: 'Invalid passenger_id' }); return }

  try {
    // Check for an active ongoing trip in DB
    const tripResult = await query(
      `SELECT t.id, t.driver_id, t.route_id, t.route_name,
              t.from_stop, t.to_stop, t.fare,
              t.status, t.payment_status, t.started_at,
              t.matatu_number,
              u.name AS driver_name, u.profile_image_url AS driver_image,
              dp.plate_number, dp.average_rating, dp.last_lat, dp.last_lng
       FROM   trips t
       JOIN   users u ON u.id = t.driver_id
       JOIN   driver_profiles dp ON dp.user_id = t.driver_id
       WHERE  t.passenger_id = $1
         AND  t.status = 'ongoing'
       ORDER  BY t.started_at DESC
       LIMIT  1`,
      [passengerId]
    )

    if (tripResult.rows.length === 0) {
      // Check if they're in a waiting state instead
      const waitingResult = await query(
        `SELECT wp.id, wp.status, wp.expires_at,
                s.name AS stop_name, s.lat AS stop_lat, s.lng AS stop_lng,
                sd.name AS destination_name,
                r.name AS route_name
         FROM   waiting_passengers wp
         JOIN   stops s ON s.id = wp.stop_id
         JOIN   routes r ON r.id = wp.route_id
         LEFT JOIN stops sd ON sd.id = wp.destination_stop_id
         WHERE  wp.passenger_id = $1
           AND  wp.status IN ('waiting', 'accepted')
           AND  wp.expires_at > NOW()
         ORDER  BY wp.created_at DESC
         LIMIT  1`,
        [passengerId]
      )

      if (waitingResult.rows.length === 0) {
        res.status(200).json({ status: 'idle', trip: null, waiting: null }); return
      }

      res.status(200).json({
        status:  'waiting',
        trip:    null,
        waiting: waitingResult.rows[0],
      })
      return
    }

    const trip = tripResult.rows[0]

    // Check if the driver is in the simulation (get real-time position)
    const driverLive = isSimulationActive(trip.driver_id)

    res.status(200).json({
      status: 'onboard',
      trip: {
        id:              trip.id,
        route_name:      trip.route_name,
        from_stop:       trip.from_stop,
        to_stop:         trip.to_stop,
        fare:            parseFloat(trip.fare) || 0,
        payment_status:  trip.payment_status,
        started_at:      trip.started_at,
        matatu_number:   trip.matatu_number,
        driver: {
          id:             trip.driver_id,
          name:           trip.driver_name,
          image:          trip.driver_image,
          plate_number:   trip.plate_number,
          average_rating: parseFloat(trip.average_rating) || 0,
          // Real-time position if simulation is running
          lat:  trip.last_lat  ? parseFloat(trip.last_lat)  : null,
          lng:  trip.last_lng  ? parseFloat(trip.last_lng)  : null,
          live: driverLive,
        },
      },
      waiting: null,
    })
  } catch (err) {
    console.error('getPassengerCurrentTrip error:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sim/driver/:driver_id/pay
// Driver confirms a passenger has paid cash.
// This updates the trip's payment_status in DB and emits a socket event back
// to the passenger so their app shows "Paid ✓".
//
// Body: { passenger_id, trip_id }
// Auth: driver (their own id)
// ─────────────────────────────────────────────────────────────────────────────
export const driverConfirmCashPayment = async (req: Request, res: Response): Promise<void> => {
  const driverId = parseInt(req.params.driver_id as string, 10)
  if (isNaN(driverId)) { res.status(400).json({ message: 'Invalid driver_id' }); return }

  const { passenger_id, trip_id } = req.body
  if (!passenger_id || !trip_id) {
    res.status(400).json({ message: 'passenger_id and trip_id are required' }); return
  }

  try {
    const result = await query(
      `UPDATE trips
       SET payment_status = 'paid',
           payment_method = 'cash',
           updated_at     = NOW()
       WHERE id = $1
         AND driver_id = $2
         AND passenger_id = $3
         AND payment_status = 'cash_pending'
       RETURNING id, fare`,
      [trip_id, driverId, passenger_id]
    )

    if (result.rowCount === 0) {
      res.status(404).json({ message: 'Trip not found or already paid' }); return
    }

    const fare = parseFloat(result.rows[0].fare)

    // Notify passenger their payment is recorded
    try {
      getIO().emit(`passenger:${passenger_id}:payment_confirmed`, {
        trip_id,
        fare,
        payment_method: 'cash',
        message:        `Cash payment of KSh ${fare} confirmed by your driver. Thank you!`,
      })
    } catch (_) {}

    res.status(200).json({
      message: `Cash payment of KSh ${fare} confirmed`,
      trip_id,
      fare,
    })
  } catch (err) {
    console.error('driverConfirmCashPayment error:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sim/passenger/:passenger_id/waiting
// Quick check — is this passenger currently in a waiting state?
// Lightweight poll used by the passenger home screen badge.
// Auth: passenger (their own id)
// ─────────────────────────────────────────────────────────────────────────────
export const getPassengerWaitingStatus = async (req: Request, res: Response): Promise<void> => {
  const passengerId = parseInt(req.params.passenger_id as string, 10)
  if (isNaN(passengerId)) { res.status(400).json({ message: 'Invalid passenger_id' }); return }

  try {
    const result = await query(
      `SELECT wp.id, wp.status, wp.expires_at,
              s.name AS stop_name, r.name AS route_name,
              sd.name AS destination_name
       FROM   waiting_passengers wp
       JOIN   stops s ON s.id = wp.stop_id
       JOIN   routes r ON r.id = wp.route_id
       LEFT JOIN stops sd ON sd.id = wp.destination_stop_id
       WHERE  wp.passenger_id = $1
         AND  wp.status IN ('waiting', 'accepted', 'boarded')
         AND  wp.expires_at > NOW()
       ORDER  BY wp.created_at DESC
       LIMIT  1`,
      [passengerId]
    )

    if (result.rows.length === 0) {
      res.status(200).json({ is_waiting: false, waiting: null }); return
    }

    res.status(200).json({
      is_waiting: true,
      waiting:    result.rows[0],
    })
  } catch (err) {
    console.error('getPassengerWaitingStatus error:', err)
    res.status(500).json({ message: 'Server error' })
  }
}