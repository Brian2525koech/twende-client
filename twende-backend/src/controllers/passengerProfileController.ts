// src/controllers/passengerProfileController.ts
// All endpoints here are passenger-only.
// They are registered under /api/passenger/profile/*
import { Request, Response } from 'express'
import { query } from '../config/db'
import bcrypt from 'bcrypt'
import { upload } from '../config/cloudinary'   // ← Import multer cloudinary middleware

// ─── GET /api/passenger/profile/stats ────────────────────────────────────────
export const getPassengerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const passengerId = (req as any).user?.id
    if (!passengerId) { res.status(401).json({ message: 'Unauthorized' }); return }

    const [tripsRes, ratingsRes, favsRes] = await Promise.all([
      query(
        `SELECT COUNT(*) AS trip_count FROM trips WHERE passenger_id = $1 AND status = 'completed'`,
        [passengerId]
      ),
      query(
        `SELECT COUNT(*) AS ratings_given, ROUND(AVG(overall_score)::numeric, 1) AS avg_score
         FROM ratings WHERE passenger_id = $1`,
        [passengerId]
      ),
      query(
        `SELECT COUNT(*) AS favourites_count FROM favourites WHERE user_id = $1`,
        [passengerId]
      ),
    ])

    res.status(200).json({
      trip_count: parseInt(tripsRes.rows[0].trip_count) || 0,
      ratings_given: parseInt(ratingsRes.rows[0].ratings_given) || 0,
      avg_score: parseFloat(ratingsRes.rows[0].avg_score) || null,
      favourites_count: parseInt(favsRes.rows[0].favourites_count) || 0,
    })
  } catch (error: any) {
    console.error('getPassengerStats error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── PATCH /api/passenger/profile/name ───────────────────────────────────────
export const updateName = async (req: Request, res: Response): Promise<void> => {
  try {
    const passengerId = (req as any).user?.id
    if (!passengerId) { res.status(401).json({ message: 'Unauthorized' }); return }

    const { name } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'Name is required' }); return
    }

    const result = await query(
      `UPDATE users SET name = $1 WHERE id = $2 AND role = 'passenger' RETURNING name`,
      [name.trim(), passengerId]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Passenger not found' }); return
    }

    res.status(200).json({ message: 'Name updated', name: result.rows[0].name })
  } catch (error: any) {
    console.error('updateName error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── PATCH /api/passenger/profile/password ───────────────────────────────────
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const passengerId = (req as any).user?.id
    if (!passengerId) { res.status(401).json({ message: 'Unauthorized' }); return }

    const { current_password, new_password } = req.body
    if (!current_password || !new_password) {
      res.status(400).json({ message: 'Both current and new password are required' }); return
    }
    if (new_password.length < 8) {
      res.status(400).json({ message: 'New password must be at least 8 characters' }); return
    }

    const userResult = await query(
      `SELECT password_hash FROM users WHERE id = $1 AND role = 'passenger'`,
      [passengerId]
    )
    if (userResult.rows.length === 0) {
      res.status(404).json({ message: 'Passenger not found' }); return
    }

    const valid = await bcrypt.compare(current_password, userResult.rows[0].password_hash)
    if (!valid) {
      res.status(400).json({ message: 'Current password is incorrect' }); return
    }

    const hashed = await bcrypt.hash(new_password, 12)
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hashed, passengerId])

    res.status(200).json({ message: 'Password changed successfully' })
  } catch (error: any) {
    console.error('changePassword error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── PATCH /api/passenger/profile/avatar ─────────────────────────────────────
// NOW USES CLOUDINARY + MULTER (real file upload)
export const updateAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const passengerId = (req as any).user?.id
    if (!passengerId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    if (!req.file) {
      res.status(400).json({ message: 'No image file provided' })
      return
    }

    // CloudinaryStorage puts the full secure URL here
    const profile_image_url = req.file.path

    await query(
      `UPDATE users SET profile_image_url = $1 WHERE id = $2 AND role = 'passenger'`,
      [profile_image_url, passengerId]
    )

    res.status(200).json({
      message: 'Avatar updated successfully',
      profile_image_url
    })
  } catch (error: any) {
    console.error('updateAvatar error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── DELETE /api/passenger/profile ───────────────────────────────────────────
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const passengerId = (req as any).user?.id
    if (!passengerId) { res.status(401).json({ message: 'Unauthorized' }); return }

    await query(`DELETE FROM users WHERE id = $1 AND role = 'passenger'`, [passengerId])
    res.status(200).json({ message: 'Account deleted' })
  } catch (error: any) {
    console.error('deleteAccount error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}