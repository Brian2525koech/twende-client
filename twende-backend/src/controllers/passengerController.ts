// src/controllers/passengerController.ts
// Handles the passenger side of the boarding/alighting/payment flow.
// The simulator auto-triggers alighting, but the passenger can also
// manually pay via M-Pesa from the frontend during the ride.

import { Request, Response } from 'express'
import { query } from '../config/db'
import { getIO } from '../socket'
import { markPassengerPaid, getOnboardPassengers } from '../simulation/simulator'
import { sendNotification } from '../utils/notificationHelper'

// ─── GET /api/passenger/trip/active ──────────────────────────────────────────
// Returns the passenger's current ongoing trip (if any)
export const getActiveTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    const passengerId = (req as any).user?.id
    if (!passengerId) { res.status(401).json({ message: 'Unauthorized' }); return }

    const result = await query(
      `SELECT
         t.id, t.from_stop, t.to_stop, t.route_name,
         t.date::text, t.time, t.fare, t.status,
         t.payment_status, t.payment_method,
         t.matatu_number, t.started_at,
         u.name AS driver_name,
         dp.average_rating AS driver_rating,
         dp.last_lat, dp.last_lng
       FROM trips t
       LEFT JOIN users u         ON u.id = t.driver_id
       LEFT JOIN driver_profiles dp ON dp.user_id = t.driver_id
       WHERE t.passenger_id = $1 AND t.status = 'ongoing'
       ORDER BY t.created_at DESC
       LIMIT 1`,
      [passengerId]
    )

    res.status(200).json({ trip: result.rows[0] || null })
  } catch (error: any) {
    console.error('getActiveTrip error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── POST /api/passenger/trip/:tripId/pay ─────────────────────────────────────
// Passenger pays via M-Pesa during the ride
// This is separate from the waiting-room payment — this is IN-RIDE payment
export const payTripMpesa = async (req: Request, res: Response): Promise<void> => {
  try {
    const passengerId = (req as any).user?.id
    const tripId      = parseInt(req.params.tripId as string, 10)

    if (!passengerId) { res.status(401).json({ message: 'Unauthorized' }); return }

    // Get the trip and driver
    const tripResult = await query(
      `SELECT t.id, t.driver_id, t.status, t.payment_status, t.fare
       FROM trips t
       WHERE t.id = $1 AND t.passenger_id = $2`,
      [tripId, passengerId]
    )

    if (tripResult.rows.length === 0) {
      res.status(404).json({ message: 'Trip not found' }); return
    }

    const trip = tripResult.rows[0]

    if (!['ongoing', 'completed'].includes(trip.status)) {
      res.status(400).json({ message: 'Trip is not in a payable state' }); return
    }

    if (trip.payment_status === 'paid') {
      res.status(400).json({ message: 'Trip already paid' }); return
    }

    // Update payment
    await query(
      `UPDATE trips
       SET payment_status = 'paid',
           payment_method = 'mpesa',
           status = CASE WHEN status = 'completed' THEN 'completed' ELSE status END,
           updated_at = NOW()
       WHERE id = $1`,
      [tripId]
    )

    // Tell the simulator the passenger has paid (so driver dashboard updates)
    if (trip.driver_id) {
      markPassengerPaid(trip.driver_id, passengerId)
    }

    // Send confirmation notification
    await sendNotification({
      userId:  passengerId,
      title:   'Payment Confirmed ✓',
      message: `KSh ${trip.fare > 0 ? trip.fare : '–'} paid via M-Pesa. Thank you!`,
      type:    'success',
    })

    res.status(200).json({ message: 'Payment confirmed', payment_status: 'paid' })
  } catch (error: any) {
    console.error('payTripMpesa error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── GET /api/passenger/onboard-status ───────────────────────────────────────
// Passenger polls to check if the simulator has them on board
// (used by the frontend to transition from "waiting" → "on board" state)
export const getOnboardStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const passengerId = (req as any).user?.id
    if (!passengerId) { res.status(401).json({ message: 'Unauthorized' }); return }

    // Check DB for an ongoing trip for this passenger
    const tripResult = await query(
      `SELECT
         t.id, t.from_stop, t.to_stop, t.route_name,
         t.status, t.payment_status, t.matatu_number,
         t.started_at, u.name AS driver_name
       FROM trips t
       LEFT JOIN users u ON u.id = t.driver_id
       WHERE t.passenger_id = $1
         AND t.status = 'ongoing'
       ORDER BY t.created_at DESC
       LIMIT 1`,
      [passengerId]
    )

    // Check waiting_passengers for current wait status
    const waitResult = await query(
      `SELECT wp.id, wp.status, wp.trip_id,
              s.name AS stop_name, sd.name AS destination_name
       FROM waiting_passengers wp
       JOIN stops s ON s.id = wp.stop_id
       LEFT JOIN stops sd ON sd.id = wp.destination_stop_id
       WHERE wp.passenger_id = $1
         AND wp.status IN ('waiting', 'accepted', 'boarded')
       ORDER BY wp.created_at DESC
       LIMIT 1`,
      [passengerId]
    )

    res.status(200).json({
      active_trip:    tripResult.rows[0] || null,
      waiting_record: waitResult.rows[0] || null,
    })
  } catch (error: any) {
    console.error('getOnboardStatus error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── GET /api/passenger/driver/:driverId/onboard ─────────────────────────────
// Returns live passenger list for a driver (used by driver dashboard)
export const getDriverOnboardPassengers = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = parseInt(req.params.driverId as string, 10)

    // Get from simulator memory (most up-to-date)
    const memoryPassengers = getOnboardPassengers(driverId)

    // Also get from DB for any that may have been completed
    const dbResult = await query(
      `SELECT
         t.id AS trip_id,
         t.passenger_id,
         t.from_stop, t.to_stop,
         t.payment_status, t.payment_method,
         t.fare,
         u.name AS passenger_name
       FROM trips t
       JOIN users u ON u.id = t.passenger_id
       WHERE t.driver_id = $1 AND t.status = 'ongoing'
       ORDER BY t.started_at DESC`,
      [driverId]
    )

    res.status(200).json({
      // Memory data is most live; DB is authoritative
      onboard_from_db:        dbResult.rows,
      onboard_from_simulator: memoryPassengers,
    })
  } catch (error: any) {
    console.error('getDriverOnboardPassengers error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}