// src/routes/adminRoutes.ts
import { Router } from 'express'
import {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  getPlatformStats,
  getActivityFeed,

  // ── Drivers ───────────────────────────────────────────────────────────────
  getAllDrivers,
  createDriver,
  toggleDriverActive,
  updateDriverRoute,

  // ── Simulation (admin control) ────────────────────────────────────────────
  getSimStatus,
  startSim,
  startAllSim,
  stopSim,
  stopAllSim,
  restartSim,
  getRouteGeometryForSim,
  getSimOnboardPassengers,
  clearSimCache,

  // ── Routes & cities ────────────────────────────────────────────────────────
  getAdminRoutes,
  getAdminCities,
  getAdminRouteStops,
  createAdminRoute,
  updateAdminRoute,
  deleteAdminRoute,
  addAdminStop,
  updateAdminStop,
  deleteAdminStop,
  reorderAdminStop,

  // ── Passengers ────────────────────────────────────────────────────────────
  getAdminPassengers,
  getAdminWaiting,
  getAdminPassengerTrips,

  // ── Trips ──────────────────────────────────────────────────────────────────
  getAdminTripsPage,

  // ── Notifications ─────────────────────────────────────────────────────────
  searchAdminUsers,
  getNotificationBroadcasts,
  sendNotificationToUser,
  sendNotificationToRoute,
  sendNotificationToDrivers,
} from '../controllers/adminController'

const router = Router()

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/stats',    getPlatformStats)
router.get('/activity', getActivityFeed)

// ── Drivers ───────────────────────────────────────────────────────────────────
router.get(  '/drivers',             getAllDrivers)
router.post( '/drivers',             createDriver)
router.patch('/drivers/:id/active',  toggleDriverActive)
router.patch('/drivers/:id/route',   updateDriverRoute)

// ── Simulation control (admin only) ───────────────────────────────────────────
// Status / inspection
router.get( '/sim/status',                getSimStatus)
router.get( '/sim/route/:route_id',       getRouteGeometryForSim)
router.get( '/sim/passengers/:driver_id', getSimOnboardPassengers)
router.get( '/sim/onboard/:driver_id',    getSimOnboardPassengers)  // alias

// Start / stop controls
router.post('/sim/start',                 startSim)       // one driver
router.post('/sim/start-all',             startAllSim)    // all drivers with routes
router.post('/sim/stop',                  stopSim)        // one driver
router.post('/sim/stop-all',              stopAllSim)     // all drivers
router.post('/sim/restart',               restartSim)     // stop → start one driver

// Cache management
router.post('/sim/clear-cache',           clearSimCache)

// ── Routes & stops ────────────────────────────────────────────────────────────
router.get(   '/routes',                  getAdminRoutes)
router.post(  '/routes',                  createAdminRoute)
router.put(   '/routes/:id',              updateAdminRoute)
router.delete('/routes/:id',              deleteAdminRoute)
router.get(   '/routes/:id/stops',        getAdminRouteStops)
router.post(  '/routes/:id/stops',        addAdminStop)

router.put(   '/stops/:stop_id',          updateAdminStop)
router.delete('/stops/:stop_id',          deleteAdminStop)
router.put(   '/stops/:stop_id/reorder',  reorderAdminStop)

// ── Cities ────────────────────────────────────────────────────────────────────
router.get('/cities', getAdminCities)

// ── Passengers ────────────────────────────────────────────────────────────────
router.get('/passengers',         getAdminPassengers)
router.get('/passengers/waiting', getAdminWaiting)
router.get('/passengers/trips',   getAdminPassengerTrips)

// ── Trips ─────────────────────────────────────────────────────────────────────
router.get('/trips', getAdminTripsPage)

// ── Notifications ─────────────────────────────────────────────────────────────
// /users/search must come before any /:id-style route
router.get( '/users/search',             searchAdminUsers)
router.get( '/notifications/broadcasts', getNotificationBroadcasts)
router.post('/notifications/user',       sendNotificationToUser)
router.post('/notifications/route',      sendNotificationToRoute)
router.post('/notifications/drivers',    sendNotificationToDrivers)

export default router