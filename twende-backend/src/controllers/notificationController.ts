// src/controllers/notificationController.ts
import { Request, Response } from 'express';
import { query } from '../config/db'; // Use the named export to match matatuController

export const getNotifications = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    // 1. We use the query wrapper you defined in db.ts
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    // 2. Wrap the result in an object so the Frontend's res.data.notifications works!
    res.json({ notifications: result.rows });
    
  } catch (error: any) {
    // Check your BACKEND terminal for this message! 
    // It will tell you if the table is missing or the SQL is wrong.
    console.error('NOTIFICATION ERROR:', error.message);
    res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
    res.status(200).json({ message: 'Marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
    res.status(200).json({ message: 'All marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM notifications WHERE id = $1', [id]);
    res.status(200).json({ message: 'Notification deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const clearAllNotifications = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    await query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    res.status(200).json({ message: 'All notifications cleared' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed' });
  }
};