// src/routes/simulationRoutes.ts
//
// ═══════════════════════════════════════════════════════════════════════════════
// TWENDE SIMULATION ROUTES  (mounted at /api/sim)
// ═══════════════════════════════════════════════════════════════════════════════
//
// These routes are shared across all roles (passenger, driver, admin).
// Admin-only simulation CONTROL (start/stop) stays in adminRoutes.ts.
//
// Mount in your main app file:
//   import simRoutes from './routes/simulationRoutes'
//   app.use('/api/sim', authMiddleware, simRoutes)
//
// ─── Route Map ────────────────────────────────────────────────────────────────
//
//  READ — map data (all authenticated users)
//  GET  /api/sim/active                          all running matatus (passenger map)
//  GET  /api/sim/route/:route_id                 matatus on one route + stops
//
//  READ — driver state
//  GET  /api/sim/driver/:driver_id               full live state (dashboard)
//  GET  /api/sim/driver/:driver_id/status        is simulation running? (lightweight)
//
//  WRITE — driver actions
//  POST /api/sim/driver/:driver_id/pay           confirm cash payment for a passenger
//
//  READ — passenger state
//  GET  /api/sim/passenger/:passenger_id/trip    current trip or waiting record
//  GET  /api/sim/passenger/:passenger_id/waiting is passenger waiting?
//
//  WRITE — passenger actions
//  POST   /api/sim/passenger/waiting             mark self as waiting at a stop
//  DELETE /api/sim/passenger/waiting             cancel waiting request
//
// ═══════════════════════════════════════════════════════════════════════════════

import { Router } from 'express'
import {
  getActiveSimulations,
  getActiveSimulationsForRoute,
  getDriverSimState,
  getDriverSimStatus,
  driverConfirmCashPayment,
  getPassengerCurrentTrip,
  getPassengerWaitingStatus,
  markPassengerWaiting,
  cancelPassengerWaiting,
} from '../controllers/simulationController'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

// ── Map / global ──────────────────────────────────────────────────────────────
// All active matatus across the platform (passenger home map)
router.get('/active',              getActiveSimulations)

// All active matatus on a specific route
router.get('/route/:route_id',     getActiveSimulationsForRoute)

// ── Driver ────────────────────────────────────────────────────────────────────
// Full live simulation state for a driver (dashboard polling or socket fallback)
router.get('/driver/:driver_id',          getDriverSimState)

// Lightweight: is this driver's simulation currently running?
router.get('/driver/:driver_id/status',   getDriverSimStatus)

// Driver confirms a passenger has paid cash
router.post('/driver/:driver_id/pay',     driverConfirmCashPayment)

// ── Passenger ─────────────────────────────────────────────────────────────────
// Current trip or waiting record (live trip screen)
router.get('/passenger/:passenger_id/trip', requireAuth,    getPassengerCurrentTrip)

// Quick waiting-badge poll (home screen)
router.get('/passenger/:passenger_id/waiting', requireAuth, getPassengerWaitingStatus)

// Mark self as waiting at a stop
router.post('/passenger/waiting', requireAuth,   markPassengerWaiting)

// Cancel waiting request
router.delete('/passenger/waiting', requireAuth, cancelPassengerWaiting)

export default router