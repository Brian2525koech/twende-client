// src/controllers/imageController.ts

import { Request, Response } from 'express';
import { query } from '../config/db';

export const uploadMatatuPhoto = async (req: Request, res: Response) => {
  try {
    const { profile_id } = req.body; // Sent from frontend
    const imageUrl = req.file?.path; // This is the Cloudinary URL

    if (!imageUrl) {
      return res.status(400).json({ message: "No image file uploaded" });
    }

    // 1. Save to the main profile or the gallery? 
    // Let's assume this adds to the gallery (matatu_images table)
    const result = await query(
      `INSERT INTO matatu_images (driver_profile_id, image_url, caption)
       VALUES ($1, $2, $3) RETURNING *`,
      [profile_id, imageUrl, req.body.caption || 'New Photo']
    );

    res.status(201).json({
      message: "Image stored successfully!",
      data: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Upload failed" });
  }
};