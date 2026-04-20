// src/controllers/driverController.ts
import { Request, Response } from 'express'
import { query } from '../config/db'
import { getIO } from '../socket'
import bcrypt from 'bcrypt';

interface AuthRequest extends Request {
  user?: { id: number; [key: string]: any }
}

// ─── GET /api/driver/dashboard ────────────────────────────────────────────────
export const getDriverDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user?.id
    if (!driverId) { res.status(401).json({ message: 'Unauthorized' }); return }

    // 1. Driver profile + route info
    const profileResult = await query(
      `SELECT
         dp.id              AS profile_id,
         dp.plate_number,
         dp.is_active,
         dp.capacity,
         dp.average_rating,
         dp.total_ratings,
         dp.vehicle_make,
         dp.vehicle_model,
         dp.vehicle_year,
         dp.vehicle_colour,
         dp.route_id,
         u.name             AS driver_name,
         u.profile_image_url,
         r.name             AS route_name,
         r.colour           AS route_colour,
         c.name             AS city_name
       FROM driver_profiles dp
       JOIN users u          ON u.id  = dp.user_id
       LEFT JOIN routes r    ON r.id  = dp.route_id
       LEFT JOIN cities c    ON c.id  = r.city_id
       WHERE dp.user_id = $1`,
      [driverId]
    )

    if (profileResult.rows.length === 0) {
      res.status(404).json({ message: 'Driver profile not found' }); return
    }
    const profile = profileResult.rows[0]

    // 2. Today's stats
    const todayStats = await query(
      `SELECT
         COUNT(*)                                           AS trips_today,
         COALESCE(SUM(fare), 0)                            AS earnings_today,
         COALESCE(SUM(passenger_count), 0)                 AS passengers_today,
         COUNT(*) FILTER (WHERE status = 'completed')      AS completed_today,
         COUNT(*) FILTER (WHERE status = 'cancelled')      AS cancelled_today
       FROM trips
       WHERE driver_id = $1 AND date = CURRENT_DATE`,
      [driverId]
    )

    // 3. Waiting passengers on this driver's route
    const waitingResult = await query(
      `SELECT
         wp.id,
         wp.status,
         wp.created_at,
         wp.expires_at,
         wp.accepted_by_driver_id,
         u.name   AS passenger_name,
         s.name   AS stop_name,
         s.lat,
         s.lng,
         s.order_index,
         sd.name  AS destination_name
       FROM waiting_passengers wp
       JOIN users u  ON u.id  = wp.passenger_id
       JOIN stops s  ON s.id  = wp.stop_id
       LEFT JOIN stops sd ON sd.id = wp.destination_stop_id
       WHERE wp.route_id = $1
         AND wp.status IN ('waiting', 'accepted')
         AND wp.expires_at > NOW()
       ORDER BY s.order_index ASC, wp.created_at ASC`,
      [profile.route_id]
    )

    // 4. Recent trips (last 5)
    const recentTrips = await query(
      `SELECT
         t.id,
         t.from_stop,
         t.to_stop,
         t.route_name,
         t.date::text,
         t.time,
         t.fare,
         t.status,
         t.payment_status,
         COALESCE(t.passenger_count, 1) AS passenger_count,
         t.matatu_number,
         u.name AS passenger_name
       FROM trips t
       LEFT JOIN users u ON u.id = t.passenger_id
       WHERE t.driver_id = $1
       ORDER BY t.created_at DESC
       LIMIT 5`,
      [driverId]
    )

    // 5. Recent ratings (last 3)
    const recentRatings = await query(
      `SELECT
         r.overall_score,
         r.comment,
         r.created_at,
         u.name AS passenger_name
       FROM ratings r
       LEFT JOIN users u ON u.id = r.passenger_id
       WHERE r.driver_id = $1
       ORDER BY r.created_at DESC
       LIMIT 3`,
      [driverId]
    )

    res.status(200).json({
      profile: {
        ...profile,
        average_rating: parseFloat(profile.average_rating) || 0,
      },
      stats: {
        trips_today:      parseInt(todayStats.rows[0].trips_today)      || 0,
        earnings_today:   parseFloat(todayStats.rows[0].earnings_today) || 0,
        passengers_today: parseInt(todayStats.rows[0].passengers_today) || 0,
        completed_today:  parseInt(todayStats.rows[0].completed_today)  || 0,
        cancelled_today:  parseInt(todayStats.rows[0].cancelled_today)  || 0,
      },
      waiting_passengers: waitingResult.rows,
      recent_trips:       recentTrips.rows,
      recent_ratings:     recentRatings.rows,
    })
  } catch (error: any) {
    console.error('getDriverDashboard error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── PATCH /api/driver/status ─────────────────────────────────────────────────
export const toggleDriverStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user?.id
    if (!driverId) { res.status(401).json({ message: 'Unauthorized' }); return }

    const { is_active } = req.body
    if (typeof is_active !== 'boolean') {
      res.status(400).json({ message: 'is_active must be a boolean' }); return
    }

    const result = await query(
      `UPDATE driver_profiles
       SET is_active = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING is_active, route_id, plate_number`,
      [is_active, driverId]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Driver profile not found' }); return
    }

    const { route_id, plate_number } = result.rows[0]

    // Broadcast so passengers see the driver appear/disappear on the map
    getIO().emit(`route:${route_id}:driver_status`, {
      driver_id:   driverId,
      plate_number,
      is_active,
    })

    res.status(200).json({
      message:   is_active ? 'You are now online' : 'You are now offline',
      is_active,
    })
  } catch (error: any) {
    console.error('toggleDriverStatus error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─── GET /api/driver/waiting ──────────────────────────────────────────────────
// HTTP fallback — used when socket drops
export const getDriverWaiting = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user?.id
    if (!driverId) { res.status(401).json({ message: 'Unauthorized' }); return }

    const profileResult = await query(
      'SELECT route_id FROM driver_profiles WHERE user_id = $1',
      [driverId]
    )
    if (profileResult.rows.length === 0) {
      res.status(404).json({ message: 'Driver profile not found' }); return
    }
    const routeId = profileResult.rows[0].route_id

    const result = await query(
      `SELECT
         wp.id,
         wp.status,
         wp.created_at,
         wp.expires_at,
         wp.accepted_by_driver_id,
         u.name   AS passenger_name,
         s.name   AS stop_name,
         s.lat,
         s.lng,
         s.order_index,
         sd.name  AS destination_name
       FROM waiting_passengers wp
       JOIN users u  ON u.id  = wp.passenger_id
       JOIN stops s  ON s.id  = wp.stop_id
       LEFT JOIN stops sd ON sd.id = wp.destination_stop_id
       WHERE wp.route_id = $1
         AND wp.status IN ('waiting', 'accepted')
         AND wp.expires_at > NOW()
       ORDER BY s.order_index ASC, wp.created_at ASC`,
      [routeId]
    )

    res.status(200).json({
      waiting_passengers: result.rows,
      route_id:           routeId,
    })
  } catch (error: any) {
    console.error('getDriverWaiting error:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
 
/** Extract driver_profile.id for the authenticated user */
async function getDriverProfileId(userId: number): Promise<number | null> {
  const r = await query(
    'SELECT id FROM driver_profiles WHERE user_id = $1',
    [userId],
  );
  return r.rows[0]?.id ?? null;
}
 
// ══════════════════════════════════════════════════════════════════════════
// GET /api/driver/profile
// Returns the full DriverProfilePageData the frontend hook expects
// ══════════════════════════════════════════════════════════════════════════
export const getDriverProfile = async (req: AuthRequest, res: Response) => {
  const userId = (req as any).user!.id;
 
  try {
    // 1. Core profile row
    const profileRes = await query(
      `SELECT
         u.id            AS user_id,
         u.name          AS driver_name,
         u.email,
         u.profile_image_url,
         u.created_at,
         ci.name         AS city_name,
         dp.id           AS driver_profile_id,
         dp.plate_number,
         dp.capacity,
         dp.is_active,
         dp.vehicle_make,
         dp.vehicle_model,
         dp.vehicle_year,
         dp.vehicle_colour,
         dp.amenities,
         dp.total_trips,
         dp.average_rating,
         dp.total_ratings,
         dp.last_lat,
         dp.last_lng,
         r.id            AS route_id,
         r.name          AS route_name,
         r.colour        AS route_colour,
         r.description   AS route_description,
         ci2.name        AS route_city_name
       FROM users u
       LEFT JOIN driver_profiles dp ON dp.user_id = u.id
       LEFT JOIN cities ci          ON ci.id = u.city_id
       LEFT JOIN routes r           ON r.id  = dp.route_id
       LEFT JOIN cities ci2         ON ci2.id = r.city_id
       WHERE u.id = $1`,
      [userId],
    );
 
    if (!profileRes.rows[0]) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }
 
    const row = profileRes.rows[0];
 
    // 2. Stop count for the route
    let stop_count = 0;
    if (row.route_id) {
      const stopRes = await query(
        'SELECT COUNT(*) FROM stops WHERE route_id = $1',
        [row.route_id],
      );
      stop_count = parseInt(stopRes.rows[0].count, 10);
    }
 
    // 3. Matatu images
    const imagesRes = await query(
      `SELECT id, image_url, caption, order_index, created_at
       FROM matatu_images
       WHERE driver_profile_id = $1
       ORDER BY order_index ASC, created_at ASC`,
      [row.driver_profile_id],
    );
 
    // 4. Recent ratings (last 10 for the profile page preview)
    const ratingsRes = await query(
      `SELECT
         rat.id,
         u.name          AS passenger_name,
         rat.punctuality_score,
         rat.comfort_score,
         rat.safety_score,
         rat.overall_score,
         rat.comment,
         rat.created_at
       FROM ratings rat
       LEFT JOIN users u ON u.id = rat.passenger_id
       WHERE rat.driver_id = $1
       ORDER BY rat.created_at DESC
       LIMIT 10`,
      [userId],
    );
 
    return res.json({
      profile: {
        user_id:            row.user_id,
        driver_name:        row.driver_name,
        email:              row.email,
        profile_image_url:  row.profile_image_url,
        created_at:         row.created_at,
        city_name:          row.city_name,
        plate_number:       row.plate_number,
        capacity:           row.capacity,
        is_active:          row.is_active,
        vehicle_make:       row.vehicle_make,
        vehicle_model:      row.vehicle_model,
        vehicle_year:       row.vehicle_year,
        vehicle_colour:     row.vehicle_colour,
        amenities:          row.amenities ?? [],
        total_trips:        row.total_trips ?? 0,
        average_rating:     parseFloat(row.average_rating) || 0,
        total_ratings:      row.total_ratings ?? 0,
        route: row.route_id
          ? {
              id:          row.route_id,
              name:        row.route_name,
              colour:      row.route_colour,
              description: row.route_description,
              city_name:   row.route_city_name,
              stop_count,
            }
          : null,
      },
      images:  imagesRes.rows,
      ratings: ratingsRes.rows,
    });
  } catch (err) {
    console.error('getDriverProfile error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
 
// ══════════════════════════════════════════════════════════════════════════
// PATCH /api/driver/profile/name
// Body: { name: string }
// ══════════════════════════════════════════════════════════════════════════
export const updateDriverName = async (req: AuthRequest, res: Response) => {
  const userId = (req as any).user!.id;
  const { name } = req.body as { name: string };
 
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters' });
  }
 
  try {
    await query(
      'UPDATE users SET name = $1 WHERE id = $2',
      [name.trim(), userId],
    );
    return res.json({ message: 'Name updated' });
  } catch (err) {
    console.error('updateDriverName error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
 
// ══════════════════════════════════════════════════════════════════════════
// PATCH /api/driver/profile/password
// Body: { current_password: string, new_password: string }
// ══════════════════════════════════════════════════════════════════════════
export const updateDriverPassword = async (req: AuthRequest, res: Response) => {
  const userId = (req as any).user!.id;
  const { current_password, new_password } = req.body as {
    current_password: string;
    new_password: string;
  };
 
  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Both passwords are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }
 
  try {
    const userRes = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId],
    );
    const hash = userRes.rows[0]?.password_hash;
    const valid = await bcrypt.compare(current_password, hash);
    if (!valid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
 
    const newHash = await bcrypt.hash(new_password, 10);
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, userId],
    );
    return res.json({ message: 'Password changed' });
  } catch (err) {
    console.error('updateDriverPassword error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
 
// ══════════════════════════════════════════════════════════════════════════
// PATCH /api/driver/profile/avatar
// Body: { profile_image_url: string }  (base64 data URL or hosted URL)
// ══════════════════════════════════════════════════════════════════════════
export const updateDriverAvatar = async (req: AuthRequest, res: Response) => {
  const userId = (req as any).user!.id;
  const { profile_image_url } = req.body as { profile_image_url: string };
 
  if (!profile_image_url) {
    return res.status(400).json({ message: 'profile_image_url is required' });
  }
 
  try {
    await query(
      'UPDATE users SET profile_image_url = $1 WHERE id = $2',
      [profile_image_url, userId],
    );
    return res.json({ message: 'Avatar updated' });
  } catch (err) {
    console.error('updateDriverAvatar error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
 
// ══════════════════════════════════════════════════════════════════════════
// PATCH /api/driver/profile/vehicle
// Body: { vehicle_make, vehicle_model, vehicle_year, vehicle_colour, capacity }
// ══════════════════════════════════════════════════════════════════════════
export const updateVehicleDetails = async (req: AuthRequest, res: Response) => {
  const userId = (req as any).user!.id;
  const {
    vehicle_make,
    vehicle_model,
    vehicle_year,
    vehicle_colour,
    capacity,
  } = req.body as {
    vehicle_make:   string;
    vehicle_model:  string;
    vehicle_year:   number | null;
    vehicle_colour: string;
    capacity:       number;
  };
 
  try {
    await query(
      `UPDATE driver_profiles
       SET vehicle_make   = $1,
           vehicle_model  = $2,
           vehicle_year   = $3,
           vehicle_colour = $4,
           capacity       = $5,
           updated_at     = NOW()
       WHERE user_id = $6`,
      [vehicle_make, vehicle_model, vehicle_year, vehicle_colour, capacity, userId],
    );
    return res.json({ message: 'Vehicle details updated' });
  } catch (err) {
    console.error('updateVehicleDetails error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
 
// ══════════════════════════════════════════════════════════════════════════
// PATCH /api/driver/profile/amenities
// Body: { amenities: string[] }
// ══════════════════════════════════════════════════════════════════════════
export const updateAmenities = async (req: AuthRequest, res: Response) => {
  const userId = (req as any).user!.id;
  const { amenities } = req.body as { amenities: string[] };
 
  if (!Array.isArray(amenities)) {
    return res.status(400).json({ message: 'amenities must be an array' });
  }
 
  try {
    await query(
      `UPDATE driver_profiles
       SET amenities  = $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [amenities, userId],
    );
    return res.json({ message: 'Amenities updated' });
  } catch (err) {
    console.error('updateAmenities error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
 
// ══════════════════════════════════════════════════════════════════════════
// POST /api/driver/profile/images
// Body: { image_url, caption?, order_index? }
// ══════════════════════════════════════════════════════════════════════════
export const addMatatuImage = async (req: AuthRequest, res: Response) => {
  const userId = (req as any).user!.id;
  const { image_url, caption, order_index } = req.body as {
    image_url:   string;
    caption?:    string;
    order_index?: number;
  };
 
  if (!image_url) {
    return res.status(400).json({ message: 'image_url is required' });
  }
 
  try {
    const profileId = await getDriverProfileId(userId);
    if (!profileId) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }
 
    // Enforce max 5 images
    const countRes = await query(
      'SELECT COUNT(*) FROM matatu_images WHERE driver_profile_id = $1',
      [profileId],
    );
    if (parseInt(countRes.rows[0].count, 10) >= 5) {
      return res.status(400).json({ message: 'Maximum 5 images allowed' });
    }
 
    const r = await query(
      `INSERT INTO matatu_images (driver_profile_id, image_url, caption, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING id, image_url, caption, order_index, created_at`,
      [profileId, image_url, caption ?? null, order_index ?? 0],
    );
    return res.status(201).json({ image: r.rows[0] });
  } catch (err) {
    console.error('addMatatuImage error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
 
// ══════════════════════════════════════════════════════════════════════════
// DELETE /api/driver/profile/images/:id
// ══════════════════════════════════════════════════════════════════════════
export const deleteMatatuImage = async (req: AuthRequest, res: Response) => {
  const userId  = (req as any).user!.id;
  const imageId = parseInt(req.params.id as string, 10);
 
  try {
    const profileId = await getDriverProfileId(userId);
    if (!profileId) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }
 
    const r = await query(
      `DELETE FROM matatu_images
       WHERE id = $1 AND driver_profile_id = $2
       RETURNING id`,
      [imageId, profileId],
    );
    if (!r.rows[0]) {
      return res.status(404).json({ message: 'Image not found' });
    }
    return res.json({ message: 'Image deleted' });
  } catch (err) {
    console.error('deleteMatatuImage error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
 
// ══════════════════════════════════════════════════════════════════════════
// PATCH /api/driver/profile/images/:id
// Body: { caption?, order_index? }
// ══════════════════════════════════════════════════════════════════════════
export const updateMatatuImage = async (req: AuthRequest, res: Response) => {
  const userId  = (req as any).user!.id;
  const imageId = parseInt(req.params.id as string, 10);
  const { caption, order_index } = req.body as {
    caption?:     string;
    order_index?: number;
  };
 
  try {
    const profileId = await getDriverProfileId(userId);
    if (!profileId) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }
 
    await query(
      `UPDATE matatu_images
       SET caption     = COALESCE($1, caption),
           order_index = COALESCE($2, order_index)
       WHERE id = $3 AND driver_profile_id = $4`,
      [caption ?? null, order_index ?? null, imageId, profileId],
    );
    return res.json({ message: 'Image updated' });
  } catch (err) {
    console.error('updateMatatuImage error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
 
// ══════════════════════════════════════════════════════════════════════════
// GET /api/driver/ratings
// Returns full ratings list + category averages for DriverRatingsPage
// ══════════════════════════════════════════════════════════════════════════
export const getDriverRatings = async (req: AuthRequest, res: Response) => {
  const userId = (req as any).user!.id;
 
  try {
    // All ratings for this driver
    const ratingsRes = await query(
      `SELECT
         rat.id,
         COALESCE(u.name, 'Anonymous') AS passenger_name,
         rat.punctuality_score,
         rat.comfort_score,
         rat.safety_score,
         rat.overall_score,
         rat.comment,
         rat.created_at
       FROM ratings rat
       LEFT JOIN users u ON u.id = rat.passenger_id
       WHERE rat.driver_id = $1
       ORDER BY rat.created_at DESC`,
      [userId],
    );
 
    const rows = ratingsRes.rows;
    const count = rows.length;
 
    const avg = (field: keyof typeof rows[0]) =>
      count > 0
        ? parseFloat(
            (
              rows.reduce((sum: number, r) => sum + Number(r[field]), 0) / count
            ).toFixed(2),
          )
        : 0;
 
    // Total trips from driver_profiles
    const tripsRes = await query(
      'SELECT total_trips FROM driver_profiles WHERE user_id = $1',
      [userId],
    );
 
    return res.json({
      average_punctuality: avg('punctuality_score'),
      average_comfort:     avg('comfort_score'),
      average_safety:      avg('safety_score'),
      average_overall:     avg('overall_score'),
      total_ratings:       count,
      total_trips:         tripsRes.rows[0]?.total_trips ?? 0,
      ratings:             rows,
    });
  } catch (err) {
    console.error('getDriverRatings error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
 
// ══════════════════════════════════════════════════════════════════════════
// GET /api/driver/trips
// Returns trip history + stats for DriverTripsPage
// ══════════════════════════════════════════════════════════════════════════
export const getDriverTrips = async (req: AuthRequest, res: Response) => {
  const userId = (req as any).user!.id;
 
  try {
    const tripsRes = await query(
      `SELECT
         t.id,
         t.route_name,
         t.from_stop,
         t.to_stop,
         t.date::text             AS date,
         t.time,
         t.fare::float            AS fare,
         t.passenger_count,
         t.status,
         t.payment_status,
         t.payment_method,
         t.duration,
         t.matatu_number,
         t.started_at,
         t.ended_at
       FROM trips t
       WHERE t.driver_id = $1
       ORDER BY t.date DESC, t.time DESC`,
      [userId],
    );
 
    const trips = tripsRes.rows;
 
    // ── Compute stats ─────────────────────────────────────────────────────
    const total_trips      = trips.length;
    const total_passengers = trips.reduce((s, t) => s + (t.passenger_count ?? 0), 0);
    const total_fare_collected = trips
      .filter((t) => t.payment_status === 'paid')
      .reduce((s, t) => s + (t.fare ?? 0), 0);
 
    // Average duration — parse "23 mins" / "1h 10m" / "45m" patterns
    const durations = trips
      .map((t) => parseDurationToMinutes(t.duration))
      .filter((n): n is number => n !== null);
    const average_duration_minutes =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;
 
    // Busiest day of week
    const dayCounts: Record<string, number> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const t of trips) {
      if (!t.date) continue;
      const d = new Date(t.date + 'T00:00:00');
      const name = dayNames[d.getDay()];
      dayCounts[name] = (dayCounts[name] ?? 0) + 1;
    }
    const busiest_day =
      Object.keys(dayCounts).length > 0
        ? Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0]
        : null;
 
    return res.json({
      trips,
      stats: {
        total_trips,
        total_passengers,
        total_fare_collected: Math.round(total_fare_collected),
        average_duration_minutes,
        busiest_day,
      },
    });
  } catch (err) {
    console.error('getDriverTrips error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
 
// ── Duration parser helper ─────────────────────────────────────────────────
// Handles strings like: "23 mins", "45m", "1h 10m", "1 hr 5 mins"
function parseDurationToMinutes(raw: string | null): number | null {
  if (!raw) return null;
  let total = 0;
  const h = raw.match(/(\d+)\s*h/i);
  const m = raw.match(/(\d+)\s*m/i);
  if (h) total += parseInt(h[1], 10) * 60;
  if (m) total += parseInt(m[1], 10);
  return total > 0 ? total : null;
}