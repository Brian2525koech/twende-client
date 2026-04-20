// src/config/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'twende_main', 
    allowed_formats: ['jpg', 'png', 'jpeg'],
    // 'limit' ensures we don't cut off any part of the image.
    // 1200px is the "Sweet Spot" for both mobile and desktop screens.
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }] 
  } as any,
});

export const upload = multer({ storage });