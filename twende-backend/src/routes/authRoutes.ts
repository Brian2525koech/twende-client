//src/routes/authRoutes.ts
import { Router } from 'express'
import { register, login, getMe, logout, updateProfile } from '../controllers/authController'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', requireAuth, getMe)
router.post('/logout', logout)

// New route for changing profile image/name
router.put('/update', requireAuth, updateProfile)

export default router