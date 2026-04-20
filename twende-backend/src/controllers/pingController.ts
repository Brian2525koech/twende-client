// src/controllers/pingController.ts
import { Response } from 'express'
import { query } from '../config/db'
import { AuthRequest } from '../types'
import { calculateETA } from '../utils/haversine'
import { getIO } from '../socket'
import { sendNotification } from '../utils/notificationHelper'

export const submitPing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lat, lng, speed } = req.body
    const driverId = req.user?.id

    if (!lat || !lng) {
      res.status(400).json({ message: 'GPS coordinates required' })
      return
    }

    // 1. Log to pings history
    await query(
      `INSERT INTO pings (driver_id, lat, lng, speed) VALUES ($1, $2, $3, $4)`,
      [driverId, lat, lng, speed || 0]
    )

    // 2. Update LIVE position and status in driver_profiles
    const driverUpdate = await query(
      `UPDATE driver_profiles 
       SET last_lat = $1, last_lng = $2, is_active = true, updated_at = NOW()
       WHERE user_id = $3 
       RETURNING *`,
      [lat, lng, driverId]
    )

    if (driverUpdate.rows.length === 0) {
      res.status(404).json({ message: 'Driver profile not found' })
      return
    }

    const driver = driverUpdate.rows[0]
    
    // Get user details for the broadcast
    const userResult = await query('SELECT name FROM users WHERE id = $1', [driverId])
    const driverName = userResult.rows[0].name

    // 3. Calculate ETAs if the driver is on a route
    let stopsWithETA = []
    if (driver.route_id) {
      const stopsResult = await query(
        'SELECT * FROM stops WHERE route_id = $1 ORDER BY order_index',
        [driver.route_id]
      )
      
      stopsWithETA = stopsResult.rows.map((stop: any) => {
        const eta = calculateETA(lat, lng, stop.lat, stop.lng)

        // ✅ PROXIMITY CHECK: If matatu is between 0 and 2 minutes away
        if (eta > 0 && eta <= 2) {
          triggerWaitingPassengerAlerts(stop.id, stop.name, driver.plate_number)
        }

        return {
          ...stop,
          eta_minutes: eta
        }
      })
    }

    const payload = {
      driver_id: driverId,
      driver_name: driverName,
      plate_number: driver.plate_number,
      route_id: driver.route_id,
      average_rating: driver.average_rating,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      speed: parseFloat(speed) || 0,
      stops_eta: stopsWithETA,
      timestamp: new Date().toISOString()
    }

    // Emit live movements to listening route rooms
    getIO().to(`route-${driver.route_id}`).emit('matatu:moved', payload) 

    res.status(200).json({ message: 'Location updated', payload })
  } catch (error) {
    console.error('Ping error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

/**
 * Helper to notify real-time commuters waiting at a specific bus stop
 */
const triggerWaitingPassengerAlerts = async (stopId: number, stopName: string, plateNumber: string) => {
  try {
    const passengersResult = await query(
      `SELECT user_id FROM waiting_passengers WHERE stop_id = $1`,
      [stopId]
    )

    for (const passenger of passengersResult.rows) {
      await sendNotification({
        userId: passenger.user_id,
        title: 'Your Matatu is Arriving! 🚐',
        message: `Matatu ${plateNumber} is less than 2 mins from ${stopName}. Stand by the roadside.`,
        type: 'trip_update',
        metadata: { stopId, stopName }
      })

      // Remove them so they don't get spammed every 5 seconds as it approaches
      await query(`DELETE FROM waiting_passengers WHERE user_id = $1 AND stop_id = $2`, [passenger.user_id, stopId])
    }
  } catch (err) {
    console.error('Error triggering waiting alerts:', err)
  }
}

export const getActivePings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT dp.*, u.name as driver_name, u.profile_image_url
       FROM driver_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE dp.is_active = true AND dp.updated_at > NOW() - INTERVAL '5 minutes'`
    )

    res.status(200).json({ matatus: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

export const driverGoOffline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await query(
      'UPDATE driver_profiles SET is_active = false WHERE user_id = $1',
      [req.user?.id]
    )
    res.status(200).json({ message: 'You are now offline' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}