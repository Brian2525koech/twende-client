// src/controllers/authController.ts
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { query } from '../config/db'
import { signToken } from '../utils/jwt'
import { AuthRequest } from '../types'

export const register = async (req: Request, res: Response): Promise<void> => {
  const startTotal = Date.now();
  try {
    const { name, email, password, role, plate_number, route_id, profile_image_url } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ message: 'Name, email, password and role are required' });
      return;
    }

    const t1 = Date.now();
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    console.log(`[REGISTER] 1. Check existing email: ${Date.now() - t1}ms`);

    if (existing.rows.length > 0) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    const t2 = Date.now();
    const password_hash = await bcrypt.hash(password, 12);
    console.log(`[REGISTER] 2. bcrypt hash: ${Date.now() - t2}ms`);

    const t3 = Date.now();
    const userResult = await query(
      `INSERT INTO users (name, email, password_hash, role, profile_image_url)
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, email, role, profile_image_url, created_at`,
      [name, email, password_hash, role, profile_image_url || null]
    );
    console.log(`[REGISTER] 3. Insert user: ${Date.now() - t3}ms`);

    const user = userResult.rows[0];
    let driverProfile = null;

    if (role === 'driver' && plate_number) {
      const t4 = Date.now();
      const dpResult = await query(
        `INSERT INTO driver_profiles (user_id, plate_number, route_id)
         VALUES ($1, $2, $3) RETURNING *`,
        [user.id, plate_number, route_id || null]
      );
      console.log(`[REGISTER] 4. Insert driver profile: ${Date.now() - t4}ms`);
      driverProfile = dpResult.rows[0];
    }

    const t5 = Date.now();
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    console.log(`[REGISTER] 5. Sign token: ${Date.now() - t5}ms`);
    console.log(`[REGISTER] ✅ Total: ${Date.now() - startTotal}ms`);

    res.status(201).json({
      token,
      user: { ...user, driver_profile: driverProfile }
    });

  } catch (error: any) {
    console.error(`[REGISTER] ❌ Failed after ${Date.now() - startTotal}ms`, error);
    res.status(500).json({ 
      message: 'Server error during registration',
      error: error.message
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const startTotal = Date.now();
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // ── Step 1: User lookup
    const t1 = Date.now();
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    console.log(`[LOGIN] 1. User query: ${Date.now() - t1}ms`);
    
    if (result.rows.length === 0) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];

    // ── Step 2: Password check
    const t2 = Date.now();
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    console.log(`[LOGIN] 2. bcrypt compare: ${Date.now() - t2}ms`);

    if (!passwordMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // ── Step 3: Driver profile (drivers only)
    let driverProfile = null;
    if (user.role === 'driver') {
      const t3 = Date.now();
      const dpResult = await query(
        `SELECT dp.*, r.name as route_name, r.colour as route_colour
         FROM driver_profiles dp
         LEFT JOIN routes r ON r.id = dp.route_id
         WHERE dp.user_id = $1`,
        [user.id]
      );
      console.log(`[LOGIN] 3. Driver profile query: ${Date.now() - t3}ms`);
      driverProfile = dpResult.rows[0] || null;
    } else {
      console.log(`[LOGIN] 3. Driver profile query: skipped (role=${user.role})`);
    }

    // ── Step 4: Sign token
    const t4 = Date.now();
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    console.log(`[LOGIN] 4. Sign token: ${Date.now() - t4}ms`);

    const { password_hash, ...safeUser } = user;

    console.log(`[LOGIN] ✅ Total: ${Date.now() - startTotal}ms  role=${user.role}`);

    res.status(200).json({
      token,
      user: { ...safeUser, driver_profile: driverProfile }
    });

  } catch (error: any) {
    console.error(`[LOGIN] ❌ Failed after ${Date.now() - startTotal}ms`, error);
    res.status(500).json({ 
      message: 'Server error during login',
      error: error.message
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const startTotal = Date.now();
  try {
    const { name, profile_image_url } = req.body;

    const t1 = Date.now();
    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           profile_image_url = COALESCE($2, profile_image_url) 
       WHERE id = $3 
       RETURNING id, name, email, role, profile_image_url`,
      [name, profile_image_url, req.user?.id]
    );
    console.log(`[UPDATE_PROFILE] 1. Update query: ${Date.now() - t1}ms`);
    console.log(`[UPDATE_PROFILE] ✅ Total: ${Date.now() - startTotal}ms`);

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error(`[UPDATE_PROFILE] ❌ Failed after ${Date.now() - startTotal}ms`, error);
    res.status(500).json({ message: 'Update failed' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const startTotal = Date.now();
  try {
    const t1 = Date.now();
    const result = await query(
      'SELECT id, name, email, role, profile_image_url, created_at FROM users WHERE id = $1',
      [req.user?.id]
    );
    console.log(`[GET_ME] 1. User query: ${Date.now() - t1}ms`);

    const user = result.rows[0];
    let driverProfile = null;

    if (user.role === 'driver') {
      const t2 = Date.now();
      const dpResult = await query(
        'SELECT * FROM driver_profiles WHERE user_id = $1',
        [user.id]
      );
      console.log(`[GET_ME] 2. Driver profile query: ${Date.now() - t2}ms`);
      driverProfile = dpResult.rows[0] || null;
    } else {
      console.log(`[GET_ME] 2. Driver profile query: skipped (role=${user.role})`);
    }

    console.log(`[GET_ME] ✅ Total: ${Date.now() - startTotal}ms  role=${user.role}`);
    res.status(200).json({ user: { ...user, driver_profile: driverProfile } });

  } catch (error) {
    console.error(`[GET_ME] ❌ Failed after ${Date.now() - startTotal}ms`, error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = (_req: Request, res: Response): void => {
  res.status(200).json({ message: 'Logged out successfully' });
};