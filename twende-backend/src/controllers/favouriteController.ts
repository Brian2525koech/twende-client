import { Response } from 'express'
import { query } from '../config/db'
import { AuthRequest } from '../types'

export const getFavourites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT f.id, f.created_at, r.id as route_id, r.name as route_name,
        r.colour, r.description, c.name as city_name,
        (SELECT COUNT(*) FROM driver_profiles dp WHERE dp.route_id = r.id AND dp.is_active = true) as active_drivers,
        (SELECT ROUND(AVG(dp.average_rating), 2) FROM driver_profiles dp WHERE dp.route_id = r.id) as route_avg_rating
       FROM favourites f
       JOIN routes r ON r.id = f.route_id
       JOIN cities c ON c.id = r.city_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [req.user?.id]
    )
    res.status(200).json({ favourites: result.rows })
  } catch (error) {
    console.error('getFavourites error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

export const addFavourite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { route_id } = req.body

    if (!route_id) {
      res.status(400).json({ message: 'route_id is required' })
      return
    }

    const result = await query(
      `INSERT INTO favourites (user_id, route_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, route_id) DO NOTHING
       RETURNING *`,
      [req.user?.id, route_id]
    )

    if (result.rows.length === 0) {
      res.status(200).json({ message: 'Already in favourites' })
      return
    }

    res.status(201).json({ message: 'Added to favourites', favourite: result.rows[0] })
  } catch (error) {
    console.error('addFavourite error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

export const removeFavourite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { route_id } = req.params
    await query(
      'DELETE FROM favourites WHERE user_id = $1 AND route_id = $2',
      [req.user?.id, route_id]
    )
    res.status(200).json({ message: 'Removed from favourites' })
  } catch (error) {
    console.error('removeFavourite error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

export const checkFavourite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { route_id } = req.params
    const result = await query(
      'SELECT id FROM favourites WHERE user_id = $1 AND route_id = $2',
      [req.user?.id, route_id]
    )
    res.status(200).json({ is_favourite: result.rows.length > 0 })
  } catch (error) {
    console.error('checkFavourite error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}