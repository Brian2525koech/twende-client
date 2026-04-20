// src/routes/notificationRoutes.ts
import { Router } from 'express';
import { 
  getNotifications, 
  markAsRead, 
  deleteNotification, 
  clearAllNotifications,
  markAllRead
} from '../controllers/notificationController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Fetch history
router.get('/:userId', requireAuth, getNotifications);
router.patch('/read-all/:userId', requireAuth, markAllRead);

// Actions
router.patch('/:id/read', requireAuth, markAsRead);
router.delete('/:id', requireAuth, deleteNotification);
router.delete('/clear/:userId', requireAuth, clearAllNotifications);

export default router;