import { Router } from 'express'
import {
  getFavourites,
  addFavourite,
  removeFavourite,
  checkFavourite
} from '../controllers/favouriteController'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

router.get('/', requireAuth, getFavourites)
router.post('/', requireAuth, addFavourite)
router.delete('/:route_id', requireAuth, removeFavourite)
router.get('/check/:route_id', requireAuth, checkFavourite)

export default router