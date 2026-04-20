import { Router } from 'express'
import { getMatatuDetail, updateMatatuImage, uploadMatatuGallery } from '../controllers/matatuController'
import { upload } from '../config/cloudinary'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

// 1. Public route: Anyone can view a matatu's details (already working)
router.get('/:id', getMatatuDetail)

// 2. Private route: Only a logged-in driver can upload their vehicle image
// 'image' must match the key you use in Postman or your Frontend FormData
router.post(
  '/upload-image', 
  requireAuth, 
  upload.single('image'), 
  updateMatatuImage
)

// Add .array('images', 5) to handle multiple files in one request
router.post(
  '/upload-gallery', 
  requireAuth, 
  upload.array('images', 5), 
  uploadMatatuGallery
);

export default router