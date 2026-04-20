// src/routes/passengerRoutes.ts
import { Router } from 'express'
import {
  getActiveTrip,
  payTripMpesa,
  getOnboardStatus,
  getDriverOnboardPassengers,
} from '../controllers/passengerController'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

// Passenger's active trip
router.get('/trip/active',               requireAuth, getActiveTrip)

// Pay for a trip via M-Pesa (during or after ride)
router.post('/trip/:tripId/pay',         requireAuth, payTripMpesa)

// Poll current onboard + waiting status
router.get('/onboard-status',            requireAuth, getOnboardStatus)

// Driver dashboard: who is on board right now
router.get('/driver/:driverId/onboard',  requireAuth, getDriverOnboardPassengers)

export default router