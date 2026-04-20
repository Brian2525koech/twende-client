import { Router } from 'express'
import {
  getAllCities,
  getRoutesByCity,
  getAllRoutes,
  getRouteById,
  getStopsByRoute,
  getRouteGeometry,
  getLiveDriversByRoute,
  getRouteStops
} from '../controllers/routeController'

const router = Router()

// --- 1. STATIC ROUTES (No colons! Move these to the top) ---
router.get('/cities', getAllCities)
router.get('/all', getAllRoutes) // Corrected: Moved up and simplified path
router.get('/', getRoutesByCity) // For /api/routes?cityId=X

// --- 2. DYNAMIC ROUTES (With :id) ---
router.get('/:id', getRouteById)
router.get('/:id/geometry', getRouteGeometry)
router.get('/:id/stops', getStopsByRoute)
router.get('/:id/live-drivers', getLiveDriversByRoute)
router.get('/:id/route-stops', getRouteStops); // Renamed path to avoid confusion

export default router