// src/routes/tripRoutes.ts
import { Router } from 'express';
import { getTripHistory, payTrip} from '../controllers/tripController';
import { requireAuth } from '../middleware/authMiddleware';   // ← Use requireAuth

const router = Router();

// GET /api/trips/history — fetch passenger's trip history
router.get('/history', requireAuth, getTripHistory)
 
// POST /api/trips/:id/pay — confirm payment for an ongoing trip
router.post('/:id/pay', requireAuth, payTrip)
 
export default router;