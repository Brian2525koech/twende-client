// src/routes/passengerProfileRoutes.ts
// Register in server.ts as:
//   app.use('/api/passenger/profile', passengerProfileRoutes)

import { Router } from 'express'
import {
  getPassengerStats,
  updateName,
  changePassword,
  updateAvatar,
  deleteAccount,
} from '../controllers/passengerProfileController'
import { requireAuth } from '../middleware/authMiddleware'
import { upload } from '../config/cloudinary'   // ← Cloudinary Multer middleware

const router = Router()

// ─── Stats ─────────────────────────────────────
router.get('/',          requireAuth, getPassengerStats)   // GET  /api/passenger/profile
router.get('/stats',     requireAuth, getPassengerStats)   // GET  /api/passenger/profile/stats  (used by frontend)

// ─── Profile updates ───────────────────────────
router.patch('/name',     requireAuth, updateName)
router.patch('/password', requireAuth, changePassword)

// ─── Avatar (Cloudinary upload) ─────────────────
router.patch(
  '/avatar',
  requireAuth,                    // authenticate first
  upload.single('image'),         // ← Multer + Cloudinary (must come before controller)
  updateAvatar
)

// ─── Delete account ─────────────────────────────
router.delete('/', requireAuth, deleteAccount)

export default router