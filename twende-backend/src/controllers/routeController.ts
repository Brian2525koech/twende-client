// src/controllers/routeController.ts
import { Request, Response } from 'express'
import { query } from '../config/db'
import { getFullRoutePath } from '../utils/osrm'
import { findNearestPathPoint, haversineDistance } from '../utils/haversine'

export const getAllCities = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await query('SELECT * FROM cities ORDER BY name')
    res.status(200).json({ cities: result.rows })
  } catch (error) {
    console.error('getAllCities error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

export const getRoutesByCity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const city_id = req.query.city_id as string

    if (!city_id) {
      res.status(400).json({ message: 'city_id is required' })
      return
    }

    const result = await query(
      `SELECT r.*, c.name as city_name,
        (SELECT COUNT(*) FROM driver_profiles dp WHERE dp.route_id = r.id AND dp.is_active = true) as active_drivers,
        (SELECT ROUND(AVG(dp.average_rating), 2) FROM driver_profiles dp WHERE dp.route_id = r.id) as route_avg_rating
       FROM routes r
       JOIN cities c ON c.id = r.city_id
       WHERE r.city_id = $1
       ORDER BY r.name`,
      [city_id]
    )

    res.status(200).json({ routes: result.rows })
  } catch (error) {
    console.error('getRoutesByCity error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

export const getAllRoutes = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await query(
      `SELECT r.*, c.name as city_name
       FROM routes r
       JOIN cities c ON c.id = r.city_id
       ORDER BY c.name, r.name`
    )
    res.status(200).json({ routes: result.rows })
  } catch (error) {
    console.error('getAllRoutes error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

export const getRouteById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params

    const routeResult = await query(
      `SELECT r.*, c.name as city_name
       FROM routes r
       JOIN cities c ON c.id = r.city_id
       WHERE r.id = $1`,
      [id]
    )

    if (routeResult.rows.length === 0) {
      res.status(404).json({ message: 'Route not found' })
      return
    }

    const stopsResult = await query(
      'SELECT * FROM stops WHERE route_id = $1 ORDER BY order_index',
      [id]
    )

    res.status(200).json({
      route: routeResult.rows[0],
      stops: stopsResult.rows,
    })
  } catch (error) {
    console.error('getRouteById error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

export const getStopsByRoute = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params
    const result = await query(
      'SELECT * FROM stops WHERE route_id = $1 ORDER BY order_index',
      [id]
    )
    res.status(200).json({ stops: result.rows })
  } catch (error) {
    console.error('getStopsByRoute error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

export const getRouteGeometry = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10)

    if (isNaN(id)) {
      res.status(400).json({ message: 'Invalid route ID' })
      return
    }

    const stopsResult = await query(
      'SELECT id, name, lat, lng FROM stops WHERE route_id = $1 ORDER BY order_index',
      [id]
    )

    if (stopsResult.rows.length < 2) {
      res.status(400).json({ message: 'Route needs at least 2 stops' })
      return
    }

    const allStops = stopsResult.rows

    // ── OSRM: start → end ONLY to stay on the main highway ──
    // Passing intermediate stops to OSRM causes it to leave the highway
    // and route through side roads to reach each stop — this was the
    // "branching" problem. Start+end forces the main road only.
    const routingEndpoints = [
      {
        name: allStops[0].name,
        lat: parseFloat(allStops[0].lat),
        lng: parseFloat(allStops[0].lng),
      },
      {
        name: allStops[allStops.length - 1].name,
        lat: parseFloat(allStops[allStops.length - 1].lat),
        lng: parseFloat(allStops[allStops.length - 1].lng),
      },
    ]

    const waypoints = await getFullRoutePath(routingEndpoints)

    // ── Snap stop markers to nearest road point (visual only) ──
    // The DB stop coords may be slightly off the highway (e.g. in a town centre).
    // We snap them to the nearest point on the OSRM road path so they appear
    // ON the road line on the map, not floating beside it.
    // We only snap if the stop is within 500m of the road — beyond that we
    // keep the original coords so genuinely off-route stops stay accurate.
    const snappedStops = allStops.map((stop: any) => {
      const stopCoord = {
        lat: parseFloat(stop.lat),
        lng: parseFloat(stop.lng),
      }
      const nearest = findNearestPathPoint(stopCoord, waypoints)
      const distKm = haversineDistance(
        stopCoord.lat,
        stopCoord.lng,
        nearest.lat,
        nearest.lng
      )
      const shouldSnap = distKm < 0.5 // 500m threshold

      return {
        ...stop,
        lat: shouldSnap ? nearest.lat : stopCoord.lat,
        lng: shouldSnap ? nearest.lng : stopCoord.lng,
        snapped: shouldSnap,
        snap_distance_m: Math.round(distKm * 1000),
      }
    })

    res.status(200).json({
      route_id: id,
      waypoints,
      stops: snappedStops,
      waypoint_count: waypoints.length,
      stop_count: allStops.length,
    })
  } catch (error: any) {
    console.error('getRouteGeometry error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

export const getLiveDriversByRoute = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id)

    const result = await query(
      `SELECT 
        dp.id                   AS profile_id,
        dp.user_id,
        dp.plate_number,
        dp.average_rating,
        dp.total_ratings,
        u.name                  AS driver_name,
        p.latitude,
        p.longitude,
        p.speed,
        p.last_updated
       FROM driver_profiles dp
       JOIN users u ON u.id = dp.user_id
       LEFT JOIN LATERAL (
         SELECT
           lat        AS latitude,
           lng        AS longitude,
           speed,
           created_at AS last_updated
         FROM pings
         WHERE driver_id = dp.user_id
         ORDER BY created_at DESC
         LIMIT 1
       ) p ON true
       WHERE dp.route_id = $1
         AND dp.is_active = true`,
      [id]
    )

    res.status(200).json({
      route_id: parseInt(id, 10),
      drivers: result.rows,
    })
  } catch (error: any) {
    console.error('getLiveDriversByRoute error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

export const getRouteStops = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params
  try {
    const result = await query(
      'SELECT id, name, lat, lng, order_index FROM stops WHERE route_id = $1 ORDER BY order_index ASC',
      [id]
    )
    res.json({ stops: result.rows })
  } catch (error) {
    console.error('Error fetching route stops:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}