// src/controllers/tripController.ts
import { Request, Response } from 'express'
import { query } from '../config/db'

// GET /api/trips/history
// Returns all trips for the authenticated passenger, newest first
export const getTripHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const result = await query(
      `SELECT
         t.id,
         t.from_stop        AS "from",
         t.to_stop          AS "to",
         t.route_name       AS "routeName",
         t.date::text       AS "date",
         t.time,
         t.fare,
         t.status,
         t.duration,
         t.matatu_number    AS "matatuNumber",
         t.was_rated        AS "wasRated",
         t.created_at,
         t.driver_id        AS "driverId",
         u.name             AS "driverName",
         dp.average_rating  AS "driverRating"
       FROM trips t
       LEFT JOIN users u        ON u.id = t.driver_id
       LEFT JOIN driver_profiles dp ON dp.user_id = t.driver_id
       WHERE t.passenger_id = $1
       ORDER BY t.date DESC, t.created_at DESC`,
      [userId]
    )

    // Shape date + time into what the frontend expects
    const trips = result.rows.map(row => ({
      ...row,
      date: row.date,                           // ISO date string
      driverRating: row.driverRating
        ? parseFloat(row.driverRating)
        : undefined,
    }))

    res.status(200).json({ trips })
  } catch (error: any) {
    console.error('getTripHistory error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// POST /api/trips/:id/pay
// Marks an ongoing trip as completed (simulates M-Pesa payment confirmation)
export const payTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id
    const tripId = parseInt(req.params.id as string, 10)

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    if (isNaN(tripId)) {
      res.status(400).json({ message: 'Invalid trip ID' })
      return
    }

    // Only allow the passenger who owns the trip to pay
    const check = await query(
      `SELECT id, status FROM trips WHERE id = $1 AND passenger_id = $2`,
      [tripId, userId]
    )

    if (check.rows.length === 0) {
      res.status(404).json({ message: 'Trip not found' })
      return
    }

    if (check.rows[0].status !== 'ongoing') {
      res.status(400).json({ message: 'Trip is not in ongoing status' })
      return
    }

    const result = await query(
      `UPDATE trips
       SET status = 'completed',
           ended_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND passenger_id = $2
       RETURNING id, status, ended_at`,
      [tripId, userId]
    )

    res.status(200).json({
      message: 'Payment confirmed. Trip marked as completed.',
      trip: result.rows[0],
    })
  } catch (error: any) {
    console.error('payTrip error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}