// src/controllers/matatuController.ts
import { Request, Response } from 'express'
import { query } from '../config/db'

// ─── GET /api/matatu/:id ──────────────────────────────────────────────────────
// :id = plate number (e.g. "KCB234G") OR driver_profiles.id (numeric)
// Returns everything the MatatuDetailPage needs in one call
export const getMatatuDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const isNumeric  = /^\d+$/.test(id as string)
    const whereClause = isNumeric
      ? 'dp.id = $1'
      : 'UPPER(REPLACE(dp.plate_number, \' \', \'\')) = UPPER(REPLACE($1, \' \', \'\'))'

    // 1. Core vehicle + driver profile
    const profileResult = await query(
      `SELECT
         dp.id                AS profile_id,
         dp.user_id,
         dp.plate_number,
         dp.route_id,
         dp.capacity,
         dp.is_active,
         dp.average_rating,
         dp.total_ratings,
         dp.matatu_image_url,
         dp.vehicle_make,
         dp.vehicle_model,
         dp.vehicle_year,
         dp.vehicle_colour,
         dp.amenities,
         dp.total_trips,
         dp.last_lat,
         dp.last_lng,
         dp.updated_at,
         u.name               AS driver_name,
         u.profile_image_url  AS driver_image_url,
         u.created_at         AS driver_since,
         r.name               AS route_name,
         r.colour             AS route_colour,
         r.description        AS route_description,
         c.name               AS city_name
       FROM driver_profiles dp
       JOIN users u          ON u.id = dp.user_id
       LEFT JOIN routes r    ON r.id = dp.route_id
       LEFT JOIN cities c    ON c.id = r.city_id
       WHERE ${whereClause}`,
      [id]
    )

    if (profileResult.rows.length === 0) {
      res.status(404).json({ message: 'Matatu not found' }); return
    }

    const profile = profileResult.rows[0]

    // 2. Gallery images
    const imagesResult = await query(
      `SELECT id, image_url, caption, order_index
       FROM matatu_images
       WHERE driver_profile_id = $1
       ORDER BY order_index ASC`,
      [profile.profile_id]
    )

    // 3. Route stops
    const stopsResult = await query(
      `SELECT id, name, lat, lng, order_index
       FROM stops
       WHERE route_id = $1
       ORDER BY order_index ASC`,
      [profile.route_id]
    )

    // 4. Latest 20 ratings with comments
    const ratingsResult = await query(
      `SELECT
         r.id,
         r.punctuality_score,
         r.comfort_score,
         r.safety_score,
         r.overall_score,
         r.comment,
         r.created_at,
         u.name AS passenger_name
       FROM ratings r
       LEFT JOIN users u ON u.id = r.passenger_id
       WHERE r.driver_id = $1
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [profile.user_id]
    )

    // 5. Score distribution (1–5)
    const breakdownResult = await query(
      `SELECT overall_score, COUNT(*) AS count
       FROM ratings
       WHERE driver_id = $1
       GROUP BY overall_score
       ORDER BY overall_score DESC`,
      [profile.user_id]
    )

    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    breakdownResult.rows.forEach((row: any) => {
      distribution[parseInt(row.overall_score)] = parseInt(row.count)
    })

    // 6. Category averages
    const avgResult = await query(
      `SELECT
         ROUND(AVG(punctuality_score)::numeric, 1) AS avg_punctuality,
         ROUND(AVG(comfort_score)::numeric, 1)     AS avg_comfort,
         ROUND(AVG(safety_score)::numeric, 1)      AS avg_safety,
         ROUND(AVG(overall_score)::numeric, 2)     AS avg_overall
       FROM ratings
       WHERE driver_id = $1`,
      [profile.user_id]
    )

    const avgs = avgResult.rows[0]

    res.status(200).json({
      matatu: {
        ...profile,
        average_rating: parseFloat(profile.average_rating) || 0,
        amenities:      profile.amenities || [],
        total_trips:    profile.total_trips || 0,
      },
      images:  imagesResult.rows,
      stops:   stopsResult.rows,
      reviews: ratingsResult.rows,
      rating_breakdown: {
        distribution,
        averages: {
          punctuality: parseFloat(avgs.avg_punctuality) || 0,
          comfort:     parseFloat(avgs.avg_comfort)     || 0,
          safety:      parseFloat(avgs.avg_safety)      || 0,
          overall:     parseFloat(avgs.avg_overall)     || 0,
        },
      },
    })
  } catch (error: any) {
    console.error('getMatatuDetail error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ─── POST /api/matatu/upload-image ──────────────────────────────────────────
export const updateMatatuImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user?.id; // Retrieved from your authMiddleware
    const imageUrl = req.file?.path; // This is the URL provided by Cloudinary

    if (!imageUrl) {
      res.status(400).json({ message: 'No image file provided' });
      return;
    }

    // Update the driver's profile with the new Cloudinary URL
    const result = await query(
      `UPDATE driver_profiles 
       SET matatu_image_url = $1, updated_at = NOW() 
       WHERE user_id = $2 
       RETURNING *`,
      [imageUrl, user_id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ message: 'Driver profile not found' });
      return;
    }

    res.status(200).json({
      message: 'Vehicle image updated successfully!',
      imageUrl: imageUrl,
      profile: result.rows[0]
    });
  } catch (error: any) {
    console.error('updateMatatuImage error:', error.message);
    res.status(500).json({ message: 'Server error during upload' });
  }
};

export const uploadMatatuGallery = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user?.id;
    const files = req.files as Express.Multer.File[]; // Array of files

    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No images uploaded' });
      return;
    }

    // 1. Get the profile_id first (we need it for the foreign key)
    const profileRes = await query('SELECT id FROM driver_profiles WHERE user_id = $1', [user_id]);
    if (profileRes.rowCount === 0) {
      res.status(404).json({ message: 'Profile not found' });
      return;
    }
    const profile_id = profileRes.rows[0].id;

    // 2. Map the files into database rows
    const uploadPromises = files.map((file, index) => {
      return query(
        `INSERT INTO matatu_images (driver_profile_id, image_url, caption, order_index)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [profile_id, file.path, `Gallery Image ${index + 1}`, index]
      );
    });

    const results = await Promise.all(uploadPromises);
    const newImages = results.map(r => r.rows[0]);

    res.status(201).json({
      message: `${newImages.length} images added to gallery!`,
      images: newImages
    });
  } catch (error: any) {
    console.error('Gallery Upload Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};