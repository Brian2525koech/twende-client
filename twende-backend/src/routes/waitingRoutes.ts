// src/routes/waitingRoutes.ts
import { Router } from 'express'
import {
  createWaiting,
  cancelWaiting,
  getMyWaiting,
  getWaitingByRoute,
  acceptWaiting,
  markBoarded,
} from '../controllers/waitingController'
import { requireAuth, requireDriver } from '../middleware/authMiddleware'

const router = Router()

router.post('/', requireAuth, createWaiting)
router.get('/my', requireAuth, getMyWaiting)
router.get('/route/:routeId', getWaitingByRoute)
router.delete('/:id', requireAuth, cancelWaiting)
router.patch('/:id/accept', requireDriver, acceptWaiting)
router.patch('/:id/board', requireDriver, markBoarded)

export default router