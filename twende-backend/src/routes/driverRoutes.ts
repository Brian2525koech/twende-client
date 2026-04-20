// src/routes/driverRoutes.ts
// FIXED: All routes now use the same middleware consistently.
// Check your actual middleware file exports and make sure these names match.
// If your middleware exports { authenticate } use that; if { requireDriver } use that.

import { Router } from 'express'
import {
  getDriverDashboard,
  toggleDriverStatus,
  getDriverWaiting,
  getDriverTrips,
  getDriverRatings,
  updateMatatuImage,
  deleteMatatuImage,
  addMatatuImage,
  updateAmenities,
  updateVehicleDetails,
  updateDriverAvatar,
  updateDriverPassword,
  updateDriverName,
  getDriverProfile,
} from '../controllers/driverController'

// ── Import your actual middleware ─────────────────────────────────────────────
// OPTION A: If your middleware file is src/middleware/auth.ts and exports { authenticate }
import { requireDriver } from '../middleware/authMiddleware'
// OPTION B: If it exports { requireAuth, requireDriver } — comment out A and use:
// import { requireAuth, requireDriver } from '../middleware/authMiddleware'

const router = Router()

// ── Core dashboard routes ─────────────────────────────────────────────────────
// Using `requireDriver` — replace with `requireDriver` if you have role-checking middleware
router.get('/dashboard',  requireDriver, getDriverDashboard)
router.patch('/status',   requireDriver, toggleDriverStatus)
router.get('/waiting',    requireDriver, getDriverWaiting)

// ── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile',               requireDriver, getDriverProfile)
router.patch('/profile/name',        requireDriver, updateDriverName)
router.patch('/profile/password',    requireDriver, updateDriverPassword)
router.patch('/profile/avatar',      requireDriver, updateDriverAvatar)
router.patch('/profile/vehicle',     requireDriver, updateVehicleDetails)
router.patch('/profile/amenities',   requireDriver, updateAmenities)

// ── Matatu images ──────────────────────────────────────────────────────────────
router.post('/profile/images',           requireDriver, addMatatuImage)
router.delete('/profile/images/:id',     requireDriver, deleteMatatuImage)
router.patch('/profile/images/:id',      requireDriver, updateMatatuImage)

// ── Other driver pages ────────────────────────────────────────────────────────
router.get('/ratings',   requireDriver, getDriverRatings)
router.get('/trips',     requireDriver, getDriverTrips)
// Also register /trips/stats if you build that endpoint separately:
// router.get('/trips/stats', requireDriver, getDriverTripStats)

export default router