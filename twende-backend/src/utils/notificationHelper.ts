// src/utils/notificationHelper.ts
// Utility to insert a notification row AND optionally emit a socket event.
// Used by the simulator and controllers so notification logic is in one place.

import { query } from '../config/db'
import { getIO } from '../socket'

export type NotificationType = 'info' | 'success' | 'warning' | 'trip'

export interface NotificationPayload {
  userId: number
  title: string
  message: string
  type?: NotificationType
  socketEvent?: string        // additional socket event key if needed
  socketData?: Record<string, any>
}

export const sendNotification = async (payload: NotificationPayload): Promise<void> => {
  const { userId, title, message, type = 'info', socketEvent, socketData } = payload

  try {
    // Persist to DB
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [userId, title, message, type]
    )

    // Push to passenger's personal socket channel
    getIO().emit(`passenger:${userId}:notification`, {
      title,
      message,
      type,
    })

    // Emit any additional socket event
    if (socketEvent && socketData) {
      getIO().emit(socketEvent, socketData)
    }
  } catch (err: any) {
    // Notification failure must never crash the simulator
    console.error(`sendNotification error (userId=${userId}):`, err.message)
  }
}