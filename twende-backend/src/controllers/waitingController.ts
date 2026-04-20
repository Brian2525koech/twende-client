// src/controllers/waitingController.ts
import { Request, Response } from 'express'
import { query } from '../config/db'
import { getIO } from '../socket'

// ─── POST /api/waiting ────────────────────────────────────────────────────────
// Passenger marks themselves as waiting at a stop
export const createWaiting = async (req: Request, res: Response): Promise<void> => {
  try {
    const passengerId = (req as any).user?.id
    if (!passengerId) { res.status(401).json({ message: 'Unauthorized' }); return }

    const { route_id, stop_id, destination_stop_id } = req.body

    if (!route_id || !stop_id) {
      res.status(400).json({ message: 'route_id and stop_id are required' }); return
    }

    // Cancel any existing active wait for this passenger first
    await query(
      `UPDATE waiting_passengers
       SET status = 'cancelled'
       WHERE passenger_id = $1 AND status IN ('waiting', 'accepted')`,
      [passengerId]
    )

    // Create new waiting record
    const result = await query(
      `INSERT INTO waiting_passengers
         (passenger_id, route_id, stop_id, destination_stop_id, status, expires_at)
       VALUES ($1, $2, $3, $4, 'waiting', NOW() + INTERVAL '30 minutes')
       RETURNING *`,
      [passengerId, route_id, stop_id, destination_stop_id || null]
    )

    const waiting = result.rows[0]

    // Fetch enriched info for the socket broadcast
    const infoResult = await query(
      `SELECT
         wp.id, wp.status, wp.created_at, wp.expires_at,
         u.name   AS passenger_name,
         s.name   AS stop_name, s.lat, s.lng,
         sd.name  AS destination_name,
         r.name   AS route_name
       FROM waiting_passengers wp
       JOIN users u  ON u.id  = wp.passenger_id
       JOIN stops s  ON s.id  = wp.stop_id
       JOIN routes r ON r.id  = wp.route_id
       LEFT JOIN stops sd ON sd.id = wp.destination_stop_id
       WHERE wp.id = $1`,
      [waiting.id]
    )

    const payload = infoResult.rows[0]

    // Broadcast to all drivers on this route so dashboards update live
    getIO().emit(`route:${route_id}:passenger_waiting`, payload)

    res.status(201).json({ message: 'You are now marked as waiting', waiting: payload })
  } catch (error: any) {
    console.error('createWaiting error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── DELETE /api/waiting/:id ──────────────────────────────────────────────────
// Passenger cancels their wait
export const cancelWaiting = async (req: Request, res: Response): Promise<void> => {
  try {
    const passengerId = (req as any).user?.id
    const waitId      = parseInt(req.params.id as string, 10)

    if (!passengerId) { res.status(401).json({ message: 'Unauthorized' }); return }

    const result = await query(
      `UPDATE waiting_passengers
       SET status = 'cancelled'
       WHERE id = $1 AND passenger_id = $2 AND status IN ('waiting', 'accepted')
       RETURNING route_id`,
      [waitId, passengerId]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Active wait not found' }); return
    }

    const routeId = result.rows[0].route_id
    getIO().emit(`route:${routeId}:passenger_cancelled`, { waiting_id: waitId })

    res.status(200).json({ message: 'Wait cancelled' })
  } catch (error: any) {
    console.error('cancelWaiting error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── GET /api/waiting/my ─────────────────────────────────────────────────────
// Passenger checks their own current wait status
export const getMyWaiting = async (req: Request, res: Response): Promise<void> => {
  try {
    const passengerId = (req as any).user?.id
    if (!passengerId) { res.status(401).json({ message: 'Unauthorized' }); return }

    const result = await query(
      `SELECT
         wp.*,
         s.name   AS stop_name, s.lat, s.lng,
         sd.name  AS destination_name,
         r.name   AS route_name, r.colour AS route_colour,
         u.name   AS driver_name,
         dp.plate_number,
         dp.average_rating AS driver_rating
       FROM waiting_passengers wp
       JOIN stops s  ON s.id  = wp.stop_id
       JOIN routes r ON r.id  = wp.route_id
       LEFT JOIN stops sd          ON sd.id  = wp.destination_stop_id
       LEFT JOIN users u           ON u.id   = wp.accepted_by_driver_id
       LEFT JOIN driver_profiles dp ON dp.user_id = wp.accepted_by_driver_id
       WHERE wp.passenger_id = $1
         AND wp.status IN ('waiting', 'accepted')
         AND wp.expires_at > NOW()
       ORDER BY wp.created_at DESC
       LIMIT 1`,
      [passengerId]
    )

    res.status(200).json({ waiting: result.rows[0] || null })
  } catch (error: any) {
    console.error('getMyWaiting error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── GET /api/waiting/route/:routeId ─────────────────────────────────────────
// Driver sees all passengers waiting on a specific route
export const getWaitingByRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const routeId = parseInt(req.params.routeId as string, 10)

    const result = await query(
      `SELECT
         wp.id,
         wp.status,
         wp.created_at,
         wp.expires_at,
         wp.accepted_by_driver_id,
         u.name   AS passenger_name,
         s.name   AS stop_name, s.lat, s.lng, s.order_index,
         sd.name  AS destination_name
       FROM waiting_passengers wp
       JOIN users u  ON u.id  = wp.passenger_id
       JOIN stops s  ON s.id  = wp.stop_id
       LEFT JOIN stops sd ON sd.id = wp.destination_stop_id
       WHERE wp.route_id = $1
         AND wp.status IN ('waiting', 'accepted')
         AND wp.expires_at > NOW()
       ORDER BY s.order_index ASC, wp.created_at ASC`,
      [routeId]
    )

    res.status(200).json({ waiting_passengers: result.rows })
  } catch (error: any) {
    console.error('getWaitingByRoute error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── PATCH /api/waiting/:id/accept ───────────────────────────────────────────
// Driver accepts a waiting passenger
export const acceptWaiting = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user?.id
    const waitId   = parseInt(req.params.id as string, 10)

    if (!driverId) { res.status(401).json({ message: 'Unauthorized' }); return }

    const result = await query(
      `UPDATE waiting_passengers
       SET status                = 'accepted',
           accepted_by_driver_id = $1,
           accepted_at           = NOW()
       WHERE id = $2 AND status = 'waiting'
       RETURNING passenger_id, route_id, stop_id`,
      [driverId, waitId]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Waiting record not found or already accepted' }); return
    }

    const { passenger_id, route_id } = result.rows[0]

    // Get driver info for the notification payload
    const driverInfo = await query(
      `SELECT u.name, dp.plate_number
       FROM users u
       JOIN driver_profiles dp ON dp.user_id = u.id
       WHERE u.id = $1`,
      [driverId]
    )

    const driverName  = driverInfo.rows[0]?.name         ?? 'Driver'
    const plateNumber = driverInfo.rows[0]?.plate_number ?? ''

    // Notify the passenger directly
    getIO().emit(`passenger:${passenger_id}:accepted`, {
      waiting_id:   waitId,
      driver_name:  driverName,
      plate_number: plateNumber,
      message:      `${driverName} (${plateNumber}) is on the way to pick you up!`,
    })

    // Update the route board for all drivers
    getIO().emit(`route:${route_id}:passenger_accepted`, {
      waiting_id: waitId,
      driver_id:  driverId,
    })

    res.status(200).json({ message: 'Passenger accepted' })
  } catch (error: any) {
    console.error('acceptWaiting error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── PATCH /api/waiting/:id/board ────────────────────────────────────────────
// Driver marks a passenger as boarded
export const markBoarded = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user?.id
    const waitId   = parseInt(req.params.id as string, 10)

    if (!driverId) { res.status(401).json({ message: 'Unauthorized' }); return }

    const result = await query(
      `UPDATE waiting_passengers
       SET status     = 'boarded',
           boarded_at = NOW()
       WHERE id = $1 AND accepted_by_driver_id = $2 AND status = 'accepted'
       RETURNING passenger_id, route_id`,
      [waitId, driverId]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Not found or not your passenger' }); return
    }

    const { passenger_id, route_id } = result.rows[0]

    // Notify the passenger they are confirmed boarded
    getIO().emit(`passenger:${passenger_id}:boarded`, {
      waiting_id: waitId,
      message:    'You have been marked as boarded. Enjoy your ride!',
    })

    getIO().emit(`route:${route_id}:passenger_boarded`, { waiting_id: waitId })

    res.status(200).json({ message: 'Passenger marked as boarded' })
  } catch (error: any) {
    console.error('markBoarded error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}