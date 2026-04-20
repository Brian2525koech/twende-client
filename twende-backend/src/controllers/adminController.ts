// src/controllers/adminController.ts
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { query } from '../config/db'
import { memGet, memSet, memDel } from '../utils/memCache'
import {
  startSimulation,
  stopSimulation,
  stopAllSimulations,
  getSimulationStatus,
  getRouteWaypoints,
  isSimulationActive,
  getOnboardPassengers,
} from '../simulation/simulator'

// ─────────────────────────────────────────────────────────────────────────────
// DRIVERS — list
// GET /api/admin/drivers
// ─────────────────────────────────────────────────────────────────────────────
export const getAllDrivers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.profile_image_url,
        dp.plate_number, dp.route_id, dp.is_active,
        dp.average_rating, dp.total_ratings, dp.last_lat, dp.last_lng,
        dp.capacity, dp.vehicle_make, dp.vehicle_model,
        dp.vehicle_year, dp.vehicle_colour, dp.amenities,
        dp.total_trips, dp.matatu_image_url, u.created_at,
        r.name   AS route_name,
        r.colour AS route_colour,
        c.name   AS city_name
       FROM users u
       JOIN driver_profiles dp ON dp.user_id = u.id
       LEFT JOIN routes r ON r.id = dp.route_id
       LEFT JOIN cities c ON c.id = r.city_id
       ORDER BY u.name`
    )

    // Annotate each driver with live simulation state
    const simStatus = getSimulationStatus() as Record<string, any>
    const drivers = result.rows.map(d => ({
      ...d,
      simulation_active: !!simStatus[d.id]?.isRunning,
      sim_direction:     simStatus[d.id]?.direction ?? null,
      sim_onboard:       simStatus[d.id]?.onboardCount ?? 0,
      sim_progress:      simStatus[d.id]?.progressPercent ?? null,
    }))

    res.status(200).json({ drivers })
  } catch (error) {
    console.error('getAllDrivers error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVERS — create
// POST /api/admin/drivers
// Body: { name, email, password, plate_number, route_id?, city_id?, capacity? }
// ─────────────────────────────────────────────────────────────────────────────
export const createDriver = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, plate_number, route_id, city_id, capacity } = req.body

  if (!name || !email || !password || !plate_number) {
    res.status(400).json({ message: 'name, email, password and plate_number are required' })
    return
  }

  try {
    const dupCheck = await query(
      `SELECT
        (SELECT id FROM users           WHERE email        = $1) AS email_taken,
        (SELECT id FROM driver_profiles WHERE plate_number = $2) AS plate_taken`,
      [email, plate_number]
    )
    if (dupCheck.rows[0].email_taken) {
      res.status(409).json({ message: 'A user with that email already exists' }); return
    }
    if (dupCheck.rows[0].plate_taken) {
      res.status(409).json({ message: 'That plate number is already registered' }); return
    }

    const password_hash = await bcrypt.hash(password, 10)

    const userRes = await query(
      `INSERT INTO users (name, email, password_hash, role, city_id)
       VALUES ($1, $2, $3, 'driver', $4) RETURNING id`,
      [name, email, password_hash, city_id || null]
    )
    const userId = userRes.rows[0].id

    await query(
      `INSERT INTO driver_profiles (user_id, plate_number, route_id, capacity)
       VALUES ($1, $2, $3, $4)`,
      [userId, plate_number, route_id || null, capacity || 14]
    )

    res.status(201).json({ message: 'Driver created successfully', user_id: userId })
  } catch (error) {
    console.error('createDriver error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVERS — toggle active status
// PATCH /api/admin/drivers/:id/active
// Body: { is_active: boolean }
// ─────────────────────────────────────────────────────────────────────────────
export const toggleDriverActive = async (req: Request, res: Response): Promise<void> => {
  const driverId = parseInt(req.params.id as string, 10)
  const { is_active } = req.body

  if (isNaN(driverId) || typeof is_active !== 'boolean') {
    res.status(400).json({ message: 'Valid driver id and is_active (boolean) are required' }); return
  }

  try {
    // If deactivating, also stop any running simulation
    if (!is_active && isSimulationActive(driverId)) {
      stopSimulation(driverId)
    }

    const result = await query(
      'UPDATE driver_profiles SET is_active = $1 WHERE user_id = $2 RETURNING user_id',
      [is_active, driverId]
    )
    if (result.rowCount === 0) { res.status(404).json({ message: 'Driver not found' }); return }
    res.json({ message: `Driver ${is_active ? 'activated' : 'deactivated'}` })
  } catch (error) {
    console.error('toggleDriverActive error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVERS — update route assignment
// PATCH /api/admin/drivers/:id/route
// Body: { route_id: number }
// ─────────────────────────────────────────────────────────────────────────────
export const updateDriverRoute = async (req: Request, res: Response): Promise<void> => {
  const driverId = parseInt(req.params.id as string, 10)
  const { route_id } = req.body

  if (isNaN(driverId) || !route_id) {
    res.status(400).json({ message: 'Valid driver id and route_id are required' }); return
  }

  try {
    // If simulation is running on the old route, stop it — route change requires restart
    if (isSimulationActive(driverId)) {
      stopSimulation(driverId)
    }

    const result = await query(
      'UPDATE driver_profiles SET route_id = $1 WHERE user_id = $2 RETURNING user_id',
      [route_id, driverId]
    )
    if (result.rowCount === 0) { res.status(404).json({ message: 'Driver not found' }); return }
    res.json({ message: 'Route updated. Restart the simulation to apply the new route.' })
  } catch (error) {
    console.error('updateDriverRoute error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION — full status (admin panel overview)
// GET /api/admin/sim/status
//
// Returns every running simulation enriched with its current onboard passengers
// so the admin panel can show a live table without any socket connection.
// ─────────────────────────────────────────────────────────────────────────────
export const getSimStatus = (_req: Request, res: Response): void => {
  try {
    const raw = getSimulationStatus() as Record<string, any>

    // Enrich each entry with onboard passenger snapshot
    const enriched: Record<string, any> = {}
    for (const [driverId, sim] of Object.entries(raw)) {
      const passengers = getOnboardPassengers(Number(driverId))
      enriched[driverId] = {
        ...sim,
        onboard_passengers: passengers.map(p => ({
          name:            p.passengerName,
          destination:     p.destinationStopName,
          fare:            p.fare,
          payment_display: p.paidViaMpesa ? '✓ M-Pesa' : '⏳ Cash',
          is_virtual:      p.isVirtual,
        })),
      }
    }

    res.status(200).json({
      running_count: Object.keys(enriched).length,
      simulations:   enriched,
    })
  } catch (err) {
    console.error('getSimStatus error:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION — start one driver
// POST /api/admin/sim/start
// Body: { driver_id, speed_multiplier? }
//
// speed_multiplier guide:
//   10  → slow demo   (~5 min per leg)
//   20  → default     (~2.5 min per leg)  ← recommended
//   30  → fast        (~1.7 min per leg)
//   50  → stress test
// ─────────────────────────────────────────────────────────────────────────────
export const startSim = async (req: Request, res: Response): Promise<void> => {
  const { driver_id, speed_multiplier } = req.body

  if (!driver_id) { res.status(400).json({ message: 'driver_id is required' }); return }

  const driverId       = Number(driver_id)
  const speedMultiplier = Number(speed_multiplier) || 20

  if (speedMultiplier < 1 || speedMultiplier > 100) {
    res.status(400).json({ message: 'speed_multiplier must be between 1 and 100' }); return
  }

  try {
    // Verify driver exists and has a route before wasting time on OSRM
    const check = await query(
      `SELECT dp.route_id, dp.plate_number, u.name
       FROM driver_profiles dp JOIN users u ON u.id = dp.user_id
       WHERE dp.user_id = $1`,
      [driverId]
    )
    if (check.rows.length === 0) {
      res.status(404).json({ message: 'Driver not found' }); return
    }
    if (!check.rows[0].route_id) {
      res.status(400).json({
        message: `Driver "${check.rows[0].name}" has no route assigned. Assign a route first.`,
      }); return
    }

    const result = await startSimulation(driverId, speedMultiplier)
    res.status(result.success ? 200 : 500).json(result)
  } catch (error) {
    console.error('startSim error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION — start ALL drivers that have a route assigned
// POST /api/admin/sim/start-all
// Body: { speed_multiplier? }
//
// Useful for demoing the full platform — one button starts every driver.
// Already-running simulations are skipped (not restarted).
// ─────────────────────────────────────────────────────────────────────────────
export const startAllSim = async (req: Request, res: Response): Promise<void> => {
  const speedMultiplier = Number(req.body?.speed_multiplier) || 20

  try {
    const driversRes = await query(
      `SELECT dp.user_id AS driver_id, u.name, dp.plate_number, dp.route_id
       FROM   driver_profiles dp
       JOIN   users u ON u.id = dp.user_id
       WHERE  dp.route_id IS NOT NULL
       ORDER  BY u.name`
    )

    if (driversRes.rows.length === 0) {
      res.status(200).json({ message: 'No drivers with routes found', started: 0, skipped: 0 })
      return
    }

    const results = { started: 0, skipped: 0, failed: 0, details: [] as any[] }

    for (const driver of driversRes.rows) {
      if (isSimulationActive(driver.driver_id)) {
        results.skipped++
        results.details.push({ driver_id: driver.driver_id, name: driver.name, status: 'already_running' })
        continue
      }

      const r = await startSimulation(driver.driver_id, speedMultiplier)
      if (r.success) {
        results.started++
        results.details.push({ driver_id: driver.driver_id, name: driver.name, plate: driver.plate_number, status: 'started', message: r.message })
      } else {
        results.failed++
        results.details.push({ driver_id: driver.driver_id, name: driver.name, status: 'failed', message: r.message })
      }
    }

    res.status(200).json({
      message: `Started ${results.started}, skipped ${results.skipped} already-running, failed ${results.failed}`,
      ...results,
    })
  } catch (error) {
    console.error('startAllSim error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION — stop one driver
// POST /api/admin/sim/stop
// Body: { driver_id }
// ─────────────────────────────────────────────────────────────────────────────
export const stopSim = async (req: Request, res: Response): Promise<void> => {
  const { driver_id } = req.body
  if (!driver_id) { res.status(400).json({ message: 'driver_id is required' }); return }

  try {
    const driverId = Number(driver_id)
    if (!isSimulationActive(driverId)) {
      res.status(200).json({ message: `No simulation running for driver ${driverId}` }); return
    }

    stopSimulation(driverId)
    // stopSimulation already sets is_active=false in DB
    res.status(200).json({ message: `Simulation stopped for driver ${driverId}` })
  } catch (error) {
    console.error('stopSim error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION — stop all
// POST /api/admin/sim/stop-all
// ─────────────────────────────────────────────────────────────────────────────
export const stopAllSim = async (_req: Request, res: Response): Promise<void> => {
  try {
    const before = Object.keys(getSimulationStatus()).length
    await stopAllSimulations()
    res.status(200).json({ message: `Stopped ${before} simulation${before !== 1 ? 's' : ''}` })
  } catch (error) {
    console.error('stopAllSim error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION — restart one driver (stop → start)
// POST /api/admin/sim/restart
// Body: { driver_id, speed_multiplier? }
// ─────────────────────────────────────────────────────────────────────────────
export const restartSim = async (req: Request, res: Response): Promise<void> => {
  const { driver_id, speed_multiplier } = req.body
  if (!driver_id) { res.status(400).json({ message: 'driver_id is required' }); return }

  const driverId        = Number(driver_id)
  const speedMultiplier = Number(speed_multiplier) || 20

  try {
    if (isSimulationActive(driverId)) {
      stopSimulation(driverId)
      // Small delay so the interval clears cleanly
      await new Promise(r => setTimeout(r, 300))
    }
    const result = await startSimulation(driverId, speedMultiplier)
    res.status(result.success ? 200 : 500).json({ restarted: result.success, ...result })
  } catch (error) {
    console.error('restartSim error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION — route geometry preview
// GET /api/admin/sim/route/:route_id
// ─────────────────────────────────────────────────────────────────────────────
export const getRouteGeometryForSim = async (req: Request, res: Response): Promise<void> => {
  const routeId = parseInt(req.params.route_id as string, 10)
  if (isNaN(routeId)) { res.status(400).json({ message: 'Invalid route_id' }); return }

  try {
    const [waypoints, stopsResult, routeResult] = await Promise.all([
      getRouteWaypoints(routeId),
      query('SELECT id, name, lat, lng, order_index FROM stops WHERE route_id = $1 ORDER BY order_index', [routeId]),
      query('SELECT id, name, colour FROM routes WHERE id = $1', [routeId]),
    ])

    if (waypoints.length === 0) { res.status(404).json({ message: 'No waypoints found for this route' }); return }

    res.status(200).json({
      route:          routeResult.rows[0] ?? null,
      route_id:       routeId,
      waypoints,
      waypoint_count: waypoints.length,
      stops:          stopsResult.rows,
    })
  } catch (error: any) {
    console.error('getRouteGeometryForSim error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION — onboard passengers for one driver
// GET /api/admin/sim/passengers/:driver_id
// GET /api/admin/sim/onboard/:driver_id    (alias)
// ─────────────────────────────────────────────────────────────────────────────
export const getSimOnboardPassengers = (req: Request, res: Response): void => {
  const driverId = parseInt(req.params.driver_id as string, 10)
  if (isNaN(driverId)) { res.status(400).json({ message: 'Invalid driver_id' }); return }

  const passengers = getOnboardPassengers(driverId)
  res.status(200).json({
    driver_id:         driverId,
    simulation_active: isSimulationActive(driverId),
    onboard_count:     passengers.length,
    passengers:        passengers.map(p => ({
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
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION — clear route cache
// POST /api/admin/sim/clear-cache
// Body: { route_id? }  — omit to clear all
// ─────────────────────────────────────────────────────────────────────────────
export const clearSimCache = async (req: Request, res: Response): Promise<void> => {
  try {
    const { route_id } = req.body
    const { clearCache, clearRouteCache } = await import('../utils/routeCache')
    if (route_id) {
      clearRouteCache(Number(route_id))
      res.json({ message: `Cache cleared for route ${route_id}` })
    } else {
      clearCache()
      res.json({ message: 'All route caches cleared' })
    }
  } catch (error: any) {
    console.error('clearSimCache error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD — platform stats
// GET /api/admin/stats  — cached 10 s
// ─────────────────────────────────────────────────────────────────────────────
export const getPlatformStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cached = memGet<object>('platform_stats')
    if (cached) { res.status(200).json(cached); return }

    const result = await query(`
      SELECT
        (SELECT COUNT(*)              FROM driver_profiles WHERE is_active = true)                    AS active_drivers,
        (SELECT COUNT(*)              FROM driver_profiles)                                           AS total_drivers,
        (SELECT COUNT(*)              FROM trips WHERE status = 'ongoing')                            AS passengers_onboard,
        (SELECT COUNT(*)              FROM trips WHERE date = CURRENT_DATE)                           AS trips_today,
        (SELECT COALESCE(SUM(fare),0) FROM trips WHERE date = CURRENT_DATE AND status = 'completed') AS earnings_today,
        (SELECT COUNT(*)              FROM waiting_passengers
          WHERE status IN ('waiting','accepted') AND expires_at > NOW())                              AS waiting_now,
        (SELECT COUNT(*)              FROM routes)                                                    AS total_routes
    `)

    const row    = result.rows[0]
    const simMap = getSimulationStatus() as Record<string, any>
    const payload = {
      active_drivers:     Number(row.active_drivers),
      total_drivers:      Number(row.total_drivers),
      passengers_onboard: Number(row.passengers_onboard),
      trips_today:        Number(row.trips_today),
      earnings_today:     parseFloat(row.earnings_today),
      waiting_now:        Number(row.waiting_now),
      total_routes:       Number(row.total_routes),
      running_sims:       Object.keys(simMap).length,
    }

    memSet('platform_stats', payload, 10_000)
    res.status(200).json(payload)
  } catch (error) {
    console.error('getPlatformStats error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD — activity feed
// GET /api/admin/activity
// ─────────────────────────────────────────────────────────────────────────────
export const getActivityFeed = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      WITH
      waiting_cte AS (
        SELECT wp.id, u.name AS passenger_name, s.name AS stop_name,
               sd.name AS destination_name, r.name AS route_name,
               wp.created_at, wp.status
        FROM   waiting_passengers wp
        JOIN   users  u  ON u.id  = wp.passenger_id
        JOIN   stops  s  ON s.id  = wp.stop_id
        JOIN   routes r  ON r.id  = wp.route_id
        LEFT JOIN stops sd ON sd.id = wp.destination_stop_id
        WHERE  wp.status IN ('waiting','accepted') AND wp.expires_at > NOW()
        ORDER  BY wp.created_at DESC LIMIT 10
      ),
      trips_cte AS (
        SELECT t.id, u.name AS passenger_name, t.from_stop, t.to_stop,
               t.route_name, t.fare, t.status, t.payment_status, t.created_at
        FROM   trips t
        LEFT JOIN users u ON u.id = t.passenger_id
        ORDER  BY t.created_at DESC LIMIT 10
      ),
      ratings_cte AS (
        SELECT r.id, u.name AS passenger_name, d.name AS driver_name,
               r.overall_score, r.comment, r.created_at
        FROM   ratings r
        LEFT JOIN users u ON u.id = r.passenger_id
        LEFT JOIN users d ON d.id = r.driver_id
        ORDER  BY r.created_at DESC LIMIT 5
      )
      SELECT
        COALESCE((SELECT json_agg(w) FROM waiting_cte w), '[]') AS waiting,
        COALESCE((SELECT json_agg(t) FROM trips_cte   t), '[]') AS trips,
        COALESCE((SELECT json_agg(r) FROM ratings_cte r), '[]') AS ratings
    `)
    const { waiting, trips, ratings } = result.rows[0]
    res.status(200).json({ waiting, trips, ratings })
  } catch (error) {
    console.error('getActivityFeed error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES — list  GET /api/admin/routes  — cached 30 s
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminRoutes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cached = memGet<object>('admin_routes')
    if (cached) { res.status(200).json(cached); return }

    const result = await query(`
      SELECT r.id, r.name, r.colour, r.city_id, r.description, c.name AS city_name,
        (SELECT COUNT(*)::int FROM stops s          WHERE s.route_id  = r.id)                          AS stop_count,
        (SELECT COUNT(*)::int FROM driver_profiles dp WHERE dp.route_id = r.id AND dp.is_active = true) AS active_driver_count
      FROM routes r
      JOIN cities c ON c.id = r.city_id
      ORDER BY c.name, r.name
    `)
    const payload = { routes: result.rows }
    memSet('admin_routes', payload, 30_000)
    res.status(200).json(payload)
  } catch (error) {
    console.error('getAdminRoutes error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CITIES — list  GET /api/admin/cities  — cached 5 min
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminCities = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cached = memGet<object>('admin_cities')
    if (cached) { res.status(200).json(cached); return }

    const result  = await query('SELECT * FROM cities ORDER BY name')
    const payload = { cities: result.rows }
    memSet('admin_cities', payload, 5 * 60_000)
    res.status(200).json(payload)
  } catch (error) {
    console.error('getAdminCities error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES — stops for one route  GET /api/admin/routes/:id/stops
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminRouteStops = async (req: Request, res: Response): Promise<void> => {
  const routeId = parseInt(req.params.id as string, 10)
  if (isNaN(routeId)) { res.status(400).json({ message: 'Invalid route id' }); return }
  try {
    const result = await query(
      'SELECT id, name, lat, lng, order_index FROM stops WHERE route_id = $1 ORDER BY order_index',
      [routeId]
    )
    res.status(200).json({ stops: result.rows })
  } catch (error) {
    console.error('getAdminRouteStops error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES — create  POST /api/admin/routes
// ─────────────────────────────────────────────────────────────────────────────
export const createAdminRoute = async (req: Request, res: Response): Promise<void> => {
  const { name, colour, city_id, description } = req.body
  if (!name || !colour || !city_id) {
    res.status(400).json({ message: 'name, colour and city_id are required' }); return
  }
  try {
    const result = await query(
      `INSERT INTO routes (name, colour, city_id, description) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, colour, city_id, description || null]
    )
    memDel('admin_routes')
    res.status(201).json({ route: result.rows[0] })
  } catch (error) {
    console.error('createAdminRoute error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES — update  PUT /api/admin/routes/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateAdminRoute = async (req: Request, res: Response): Promise<void> => {
  const routeId = parseInt(req.params.id as string, 10)
  const { name, colour, city_id, description } = req.body
  if (isNaN(routeId) || !name || !colour || !city_id) {
    res.status(400).json({ message: 'name, colour and city_id are required' }); return
  }
  try {
    const result = await query(
      `UPDATE routes SET name=$1, colour=$2, city_id=$3, description=$4 WHERE id=$5 RETURNING *`,
      [name, colour, city_id, description || null, routeId]
    )
    if (result.rowCount === 0) { res.status(404).json({ message: 'Route not found' }); return }
    memDel('admin_routes')
    res.status(200).json({ route: result.rows[0] })
  } catch (error) {
    console.error('updateAdminRoute error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES — delete  DELETE /api/admin/routes/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAdminRoute = async (req: Request, res: Response): Promise<void> => {
  const routeId = parseInt(req.params.id as string, 10)
  if (isNaN(routeId)) { res.status(400).json({ message: 'Invalid route id' }); return }
  try {
    const result = await query('DELETE FROM routes WHERE id=$1 RETURNING id', [routeId])
    if (result.rowCount === 0) { res.status(404).json({ message: 'Route not found' }); return }
    memDel('admin_routes')
    res.status(200).json({ message: 'Route deleted' })
  } catch (error) {
    console.error('deleteAdminRoute error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STOPS — add  POST /api/admin/routes/:id/stops
// ─────────────────────────────────────────────────────────────────────────────
export const addAdminStop = async (req: Request, res: Response): Promise<void> => {
  const routeId = parseInt(req.params.id as string, 10)
  const { name, lat, lng } = req.body
  if (isNaN(routeId) || !name || lat == null || lng == null) {
    res.status(400).json({ message: 'name, lat and lng are required' }); return
  }
  try {
    const maxRes    = await query(
      'SELECT COALESCE(MAX(order_index), -1) AS max_idx FROM stops WHERE route_id = $1',
      [routeId]
    )
    const nextIndex = Number(maxRes.rows[0].max_idx) + 1
    const result    = await query(
      `INSERT INTO stops (route_id, name, lat, lng, order_index) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [routeId, name, lat, lng, nextIndex]
    )
    res.status(201).json({ stop: result.rows[0] })
  } catch (error) {
    console.error('addAdminStop error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STOPS — update  PUT /api/admin/stops/:stop_id
// ─────────────────────────────────────────────────────────────────────────────
export const updateAdminStop = async (req: Request, res: Response): Promise<void> => {
  const stopId = parseInt(req.params.stop_id as string, 10)
  const { name, lat, lng } = req.body
  if (isNaN(stopId) || !name || lat == null || lng == null) {
    res.status(400).json({ message: 'name, lat and lng are required' }); return
  }
  try {
    const result = await query(
      `UPDATE stops SET name=$1, lat=$2, lng=$3 WHERE id=$4 RETURNING *`,
      [name, lat, lng, stopId]
    )
    if (result.rowCount === 0) { res.status(404).json({ message: 'Stop not found' }); return }
    res.status(200).json({ stop: result.rows[0] })
  } catch (error) {
    console.error('updateAdminStop error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STOPS — delete  DELETE /api/admin/stops/:stop_id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAdminStop = async (req: Request, res: Response): Promise<void> => {
  const stopId = parseInt(req.params.stop_id as string, 10)
  if (isNaN(stopId)) { res.status(400).json({ message: 'Invalid stop id' }); return }
  try {
    const result = await query('DELETE FROM stops WHERE id=$1 RETURNING id', [stopId])
    if (result.rowCount === 0) { res.status(404).json({ message: 'Stop not found' }); return }
    res.status(200).json({ message: 'Stop removed' })
  } catch (error) {
    console.error('deleteAdminStop error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STOPS — reorder  PUT /api/admin/stops/:stop_id/reorder
// ─────────────────────────────────────────────────────────────────────────────
export const reorderAdminStop = async (req: Request, res: Response): Promise<void> => {
  const stopId               = parseInt(req.params.stop_id as string, 10)
  const { order_index: newIndex } = req.body
  if (isNaN(stopId) || newIndex == null) {
    res.status(400).json({ message: 'order_index is required' }); return
  }
  try {
    const stopRes = await query('SELECT route_id, order_index FROM stops WHERE id=$1', [stopId])
    if (stopRes.rows.length === 0) { res.status(404).json({ message: 'Stop not found' }); return }

    const { route_id, order_index: currentIndex } = stopRes.rows[0]
    const displaced = await query(
      'SELECT id FROM stops WHERE route_id=$1 AND order_index=$2',
      [route_id, newIndex]
    )

    await query('BEGIN')
    if (displaced.rows.length > 0) {
      await query('UPDATE stops SET order_index=$1 WHERE id=$2', [currentIndex, displaced.rows[0].id])
    }
    await query('UPDATE stops SET order_index=$1 WHERE id=$2', [newIndex, stopId])
    await query('COMMIT')

    res.status(200).json({ message: 'Stop reordered' })
  } catch (error) {
    await query('ROLLBACK').catch(() => {})
    console.error('reorderAdminStop error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSENGERS — list + stats  GET /api/admin/passengers
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminPassengers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [passRes, statsRes] = await Promise.all([
      query(`
        SELECT u.id, u.name, u.email, u.profile_image_url, u.created_at,
               COUNT(t.id)::int  AS total_trips,
               MAX(t.date)::text AS last_trip_date
        FROM   users u
        LEFT JOIN trips t ON t.passenger_id = u.id
        WHERE  u.role = 'passenger'
        GROUP  BY u.id
        ORDER  BY u.created_at DESC
        LIMIT  100
      `),
      query(`
        SELECT
          (SELECT COUNT(*)::int FROM users WHERE role = 'passenger')                                                   AS total_passengers,
          (SELECT COUNT(DISTINCT passenger_id)::int FROM trips WHERE date = CURRENT_DATE)                              AS active_today,
          (SELECT COUNT(*)::int FROM trips WHERE date = CURRENT_DATE)                                                  AS trips_today,
          (SELECT COUNT(*)::int FROM waiting_passengers WHERE status IN ('waiting','accepted') AND expires_at > NOW())  AS waiting_now
      `),
    ])
    res.status(200).json({ passengers: passRes.rows, stats: statsRes.rows[0] })
  } catch (error) {
    console.error('getAdminPassengers error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSENGERS — live waiting  GET /api/admin/passengers/waiting
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminWaiting = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT wp.id, u.name AS passenger_name, s.name AS stop_name,
             sd.name AS destination_name, r.name AS route_name,
             wp.created_at, wp.status, wp.expires_at
      FROM   waiting_passengers wp
      JOIN   users  u  ON u.id  = wp.passenger_id
      JOIN   stops  s  ON s.id  = wp.stop_id
      JOIN   routes r  ON r.id  = wp.route_id
      LEFT JOIN stops sd ON sd.id = wp.destination_stop_id
      WHERE  wp.status IN ('waiting','accepted') AND wp.expires_at > NOW()
      ORDER  BY wp.created_at DESC
      LIMIT  50
    `)
    res.status(200).json({ waiting: result.rows })
  } catch (error) {
    console.error('getAdminWaiting error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSENGERS — trip history  GET /api/admin/passengers/trips
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminPassengerTrips = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, payment_status, date } = req.query
    const conditions: string[] = []
    const values:     unknown[] = []
    let   idx = 1

    if (status         && status         !== 'all') { conditions.push(`t.status         = $${idx++}`); values.push(status)         }
    if (payment_status && payment_status !== 'all') { conditions.push(`t.payment_status = $${idx++}`); values.push(payment_status) }
    if (date)                                       { conditions.push(`t.date           = $${idx++}`); values.push(date)           }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const result = await query(
      `SELECT t.id, u.name AS passenger_name, t.from_stop, t.to_stop,
              t.route_name, t.fare, t.status, t.payment_status,
              t.payment_method, t.created_at, t.date
       FROM   trips t LEFT JOIN users u ON u.id = t.passenger_id
       ${where}
       ORDER  BY t.created_at DESC LIMIT 50`,
      values
    )
    res.status(200).json({ trips: result.rows })
  } catch (error) {
    console.error('getAdminPassengerTrips error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIPS PAGE  GET /api/admin/trips
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminTripsPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, payment_status, route_id, date_from, date_to } = req.query
    const conditions: string[] = []
    const values:     unknown[] = []
    let   idx = 1

    if (status         && status         !== 'all') { conditions.push(`t.status         = $${idx++}`); values.push(status)         }
    if (payment_status && payment_status !== 'all') { conditions.push(`t.payment_status = $${idx++}`); values.push(payment_status) }
    if (route_id)                                   { conditions.push(`t.route_id       = $${idx++}`); values.push(Number(route_id)) }
    if (date_from)                                  { conditions.push(`t.date          >= $${idx++}`); values.push(date_from)       }
    if (date_to)                                    { conditions.push(`t.date          <= $${idx++}`); values.push(date_to)         }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `WITH filtered AS (
         SELECT t.*, u.name AS passenger_name
         FROM   trips t LEFT JOIN users u ON u.id = t.passenger_id
         ${where}
       )
       SELECT
         (SELECT COALESCE(json_agg(row_to_json(f) ORDER BY f.created_at DESC), '[]'::json)
          FROM   (SELECT * FROM filtered ORDER BY created_at DESC LIMIT 200) f)       AS trips,
         COUNT(*)::int                                                                 AS trips_today,
         COUNT(*) FILTER (WHERE status = 'completed')::int                            AS completed,
         COUNT(*) FILTER (WHERE status = 'ongoing')::int                              AS ongoing_count,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int                            AS cancelled,
         COUNT(*) FILTER (WHERE payment_status = 'cash_pending')::int                 AS cash_pending_count,
         COALESCE(SUM(fare) FILTER (WHERE status = 'completed'), 0)::numeric          AS fare_today,
         COALESCE(AVG(fare) FILTER (WHERE status = 'completed'), 0)::numeric          AS avg_fare
       FROM filtered`,
      values
    )

    const row = result.rows[0]
    res.status(200).json({
      trips: row.trips ?? [],
      stats: {
        trips_today:        row.trips_today,
        completed:          row.completed,
        ongoing_count:      row.ongoing_count,
        cancelled:          row.cancelled,
        cash_pending_count: row.cash_pending_count,
        fare_today:         parseFloat(row.fare_today),
        avg_fare:           parseFloat(parseFloat(row.avg_fare).toFixed(2)),
      },
    })
  } catch (error) {
    console.error('getAdminTripsPage error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — user search  GET /api/admin/users/search?q=
// ─────────────────────────────────────────────────────────────────────────────
export const searchAdminUsers = async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string ?? '').trim()
  if (!q || q.length < 2) { res.status(200).json({ users: [] }); return }

  try {
    const result = await query(
      `SELECT id, name, email, role, profile_image_url
       FROM   users
       WHERE  role IN ('passenger', 'driver')
         AND  (name ILIKE $1 OR email ILIKE $1)
       ORDER  BY name
       LIMIT  10`,
      [`%${q}%`]
    )
    res.status(200).json({ users: result.rows })
  } catch (error) {
    console.error('searchAdminUsers error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — broadcast history  GET /api/admin/notifications/broadcasts
// ─────────────────────────────────────────────────────────────────────────────
export const getNotificationBroadcasts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT
        MIN(id)::int                                    AS id,
        title,
        message,
        type,
        COUNT(*)::int                                   AS recipient_count,
        date_trunc('second', MIN(created_at))           AS sent_at
      FROM   notifications
      GROUP  BY title, message, type, date_trunc('second', created_at)
      ORDER  BY sent_at DESC
      LIMIT  30
    `)
    res.status(200).json({ broadcasts: result.rows })
  } catch (error) {
    console.error('getNotificationBroadcasts error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — send to user  POST /api/admin/notifications/user
// ─────────────────────────────────────────────────────────────────────────────
export const sendNotificationToUser = async (req: Request, res: Response): Promise<void> => {
  const { user_id, title, message, type = 'info' } = req.body
  if (!user_id || !title?.trim() || !message?.trim()) {
    res.status(400).json({ message: 'user_id, title and message are required' }); return
  }
  try {
    const check = await query('SELECT id FROM users WHERE id = $1', [user_id])
    if (check.rows.length === 0) { res.status(404).json({ message: 'User not found' }); return }
    await query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
      [user_id, title.trim(), message.trim(), type]
    )
    res.status(201).json({ message: 'Notification sent' })
  } catch (error) {
    console.error('sendNotificationToUser error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — broadcast to route  POST /api/admin/notifications/route
// ─────────────────────────────────────────────────────────────────────────────
export const sendNotificationToRoute = async (req: Request, res: Response): Promise<void> => {
  const { route_id, title, message, type = 'info' } = req.body
  if (!route_id || !title?.trim() || !message?.trim()) {
    res.status(400).json({ message: 'route_id, title and message are required' }); return
  }
  try {
    const passengersRes = await query(
      `SELECT DISTINCT passenger_id AS user_id FROM trips           WHERE route_id = $1
       UNION
       SELECT DISTINCT passenger_id AS user_id FROM waiting_passengers WHERE route_id = $1`,
      [route_id]
    )
    if (passengersRes.rows.length === 0) {
      res.status(200).json({ message: 'No passengers found for this route', sent: 0 }); return
    }
    const now  = new Date().toISOString()
    const rows = passengersRes.rows as { user_id: number }[]
    const params: unknown[] = []
    const placeholders = rows.map((r, i) => {
      const b = i * 5
      params.push(r.user_id, title.trim(), message.trim(), type, now)
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5})`
    })
    await query(
      `INSERT INTO notifications (user_id, title, message, type, created_at) VALUES ${placeholders.join(',')}`,
      params
    )
    res.status(201).json({ message: `Notification sent to ${rows.length} passenger${rows.length !== 1 ? 's' : ''}`, sent: rows.length })
  } catch (error) {
    console.error('sendNotificationToRoute error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — broadcast to all drivers  POST /api/admin/notifications/drivers
// ─────────────────────────────────────────────────────────────────────────────
export const sendNotificationToDrivers = async (req: Request, res: Response): Promise<void> => {
  const { title, message, type = 'info' } = req.body
  if (!title?.trim() || !message?.trim()) {
    res.status(400).json({ message: 'title and message are required' }); return
  }
  try {
    const driversRes = await query(
      `SELECT u.id AS user_id FROM users u JOIN driver_profiles dp ON dp.user_id = u.id`
    )
    if (driversRes.rows.length === 0) {
      res.status(200).json({ message: 'No drivers found', sent: 0 }); return
    }
    const now  = new Date().toISOString()
    const rows = driversRes.rows as { user_id: number }[]
    const params: unknown[] = []
    const placeholders = rows.map((r, i) => {
      const b = i * 5
      params.push(r.user_id, title.trim(), message.trim(), type, now)
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5})`
    })
    await query(
      `INSERT INTO notifications (user_id, title, message, type, created_at) VALUES ${placeholders.join(',')}`,
      params
    )
    res.status(201).json({ message: `Notification sent to ${rows.length} driver${rows.length !== 1 ? 's' : ''}`, sent: rows.length })
  } catch (error) {
    console.error('sendNotificationToDrivers error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}