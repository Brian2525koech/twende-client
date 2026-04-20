// src/controllers/ratingController.ts
import { Request, Response } from 'express'
import { query } from '../config/db'
import { AuthRequest } from '../types'

export const submitRating = async (req: Request, res: Response): Promise<void> => {
  try {
    const passenger_id = (req as any).user?.id || 13; // Default for your testing
    const { driver_id, trip_id, overall_score, comment } = req.body;

    // 1. Just Insert the rating. 
    // The Database Trigger will handle updating driver_profiles automatically!
    await query(
      `INSERT INTO ratings (passenger_id, driver_id, overall_score, comment)
       VALUES ($1, $2, $3, $4)`,
      [passenger_id, driver_id, overall_score, comment]
    );

    // 2. Mark trip as rated
    if (trip_id) {
      await query('UPDATE trips SET was_rated = TRUE WHERE id = $1', [trip_id]);
    }

    res.status(201).json({ message: 'Rating submitted! Profile updated by DB Trigger.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}
 

export const getDriverRatings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { driver_id } = req.params
    const result = await query(
      `SELECT r.*, u.name as passenger_name
       FROM ratings r
       JOIN users u ON u.id = r.passenger_id
       WHERE r.driver_id = $1
       ORDER BY r.created_at DESC`,
      [driver_id]
    )
    res.status(200).json({ ratings: result.rows })
  } catch (error) {
    console.error('getDriverRatings error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

export const getDriverRatingSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { driver_id } = req.params
    const result = await query(
      `SELECT
        ROUND(AVG(overall_score::numeric), 2) as avg_overall,
        ROUND(AVG(punctuality_score::numeric), 2) as avg_punctuality,
        ROUND(AVG(comfort_score::numeric), 2) as avg_comfort,
        ROUND(AVG(safety_score::numeric), 2) as avg_safety,
        COUNT(*) as total_ratings
       FROM ratings
       WHERE driver_id = $1`,
      [driver_id]
    )

    const profileResult = await query(
      `SELECT dp.plate_number, u.name as driver_name
       FROM driver_profiles dp
       JOIN users u ON u.id = dp.user_id
       WHERE dp.user_id = $1`,
      [driver_id]
    )

    res.status(200).json({
      summary: result.rows[0],
      driver: profileResult.rows[0] || null
    })
  } catch (error) {
    console.error('getDriverRatingSummary error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}