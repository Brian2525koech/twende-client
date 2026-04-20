import { Router } from 'express'
import {
  submitRating
} from '../controllers/ratingController'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

router.post('/', requireAuth, submitRating)

export default router