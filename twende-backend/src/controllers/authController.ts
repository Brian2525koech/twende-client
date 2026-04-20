// src/controllers/authController.ts
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { query } from '../config/db'
import { signToken } from '../utils/jwt'
import { AuthRequest } from '../types'

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, plate_number, route_id, profile_image_url } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ message: 'Name, email, password and role are required' });
      return;
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const userResult = await query(
      `INSERT INTO users (name, email, password_hash, role, profile_image_url)
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, email, role, profile_image_url, created_at`,
      [name, email, password_hash, role, profile_image_url || null]
    );

    const user = userResult.rows[0];
    let driverProfile = null;

    // FIXED: Only try to create driver profile if role is driver AND plate_number exists
    if (role === 'driver' && plate_number) {
      const dpResult = await query(
        `INSERT INTO driver_profiles (user_id, plate_number, route_id)
         VALUES ($1, $2, $3) RETURNING *`,
        [user.id, plate_number, route_id || null]
      );
      driverProfile = dpResult.rows[0];
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    
    res.status(201).json({
      token,
      user: { ...user, driver_profile: driverProfile }
    });

  } catch (error: any) {
    console.error('Register error:', error);   // Keep this for debugging
    res.status(500).json({ 
      message: 'Server error during registration',
      error: error.message   // ← Add this temporarily to see real error
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    let driverProfile = null;
    if (user.role === 'driver') {
      const dpResult = await query(
        `SELECT dp.*, r.name as route_name, r.colour as route_colour
         FROM driver_profiles dp
         LEFT JOIN routes r ON r.id = dp.route_id
         WHERE dp.user_id = $1`,
        [user.id]
      );
      driverProfile = dpResult.rows[0] || null;
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const { password_hash, ...safeUser } = user;

    res.status(200).json({
      token,
      user: { ...safeUser, driver_profile: driverProfile }
    });

  } catch (error: any) {
    console.error('Login error:', error);   // ← Very important
    res.status(500).json({ 
      message: 'Server error during login',
      error: error.message   // ← Temporary for debugging
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, profile_image_url } = req.body
    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           profile_image_url = COALESCE($2, profile_image_url) 
       WHERE id = $3 
       RETURNING id, name, email, role, profile_image_url`,
      [name, profile_image_url, req.user?.id]
    )
    res.status(200).json({ user: result.rows[0] })
  } catch (error) {
    res.status(500).json({ message: 'Update failed' })
  }
}

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT id, name, email, role, profile_image_url, created_at FROM users WHERE id = $1',
      [req.user?.id]
    )
    const user = result.rows[0]
    let driverProfile = null
    if (user.role === 'driver') {
      const dpResult = await query(
        'SELECT * FROM driver_profiles WHERE user_id = $1', [user.id]
      )
      driverProfile = dpResult.rows[0] || null
    }
    res.status(200).json({ user: { ...user, driver_profile: driverProfile } })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

export const logout = (_req: Request, res: Response): void => {
  res.status(200).json({ message: 'Logged out successfully' })
}