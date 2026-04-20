// src/features/driver/hooks/useNotifications.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api/axios';
import type { Notification } from './types';

// ✅ Use env OR fallback to current origin (works in dev + production)
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || window.location.origin;

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: number) => Promise<void>;
  clearRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useNotifications = (
  userId: number | undefined
): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ─────────────────────────────────────────────────────────────
  // FETCH NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const res = await api.get(`/notifications/${userId}`);
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('❌ Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─────────────────────────────────────────────────────────────
  // SOCKET CONNECTION (FULLY FIXED)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || isNaN(userId)) return;

    // 🛑 Prevent duplicate socket instances
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(SOCKET_URL, {
      // ✅ Start with polling for reliability, upgrade later
      transports: ['polling', 'websocket'],

      // ✅ Strong reconnection strategy
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,

      // ✅ Increase timeout for slow networks
      timeout: 10000,
    });

    socketRef.current = socket;

    // ── CONNECTION EVENTS ─────────────────────────────────────
    socket.on('connect', () => {
      console.log('✅ Driver socket connected:', socket.id);

      // 🔥 Join driver room
      socket.emit('join:driver', userId);
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      // Ignore noisy network errors
      if (
        err.message.includes('xhr poll error') ||
        err.message.includes('timeout')
      ) {
        return;
      }

      console.warn('⚠️ Socket connection issue:', err.message);
    });

    // ─────────────────────────────────────────────────────────
    // RECEIVE NOTIFICATIONS
    // ─────────────────────────────────────────────────────────
    socket.on(`driver:${userId}:notification`, (payload: any) => {
      const incoming: Notification = {
        id: Date.now(), // temporary ID (backend should ideally send one)
        user_id: userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      setNotifications(prev => [incoming, ...prev]);
    });

    // ── CLEANUP ──────────────────────────────────────────────
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId]);

  // ─────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────

  const markRead = useCallback(async (id: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );

    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      // rollback on failure
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: false } : n))
      );
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;

    const prev = [...notifications];
    setNotifications(p => p.map(n => ({ ...n, is_read: true })));

    try {
      await api.patch(`/notifications/read-all/${userId}`);
    } catch {
      setNotifications(prev);
    }
  }, [userId, notifications]);

  const remove = useCallback(async (id: number) => {
    const prev = [...notifications];
    setNotifications(p => p.filter(n => n.id !== id));

    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      setNotifications(prev);
    }
  }, [notifications]);

  const clearRead = useCallback(async () => {
    if (!userId) return;

    const prev = [...notifications];
    setNotifications([]);

    try {
      await api.delete(`/notifications/clear/${userId}`);
    } catch {
      setNotifications(prev);
    }
  }, [userId, notifications]);

  // ─────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────
  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    remove,
    clearRead,
    refresh: fetchAll,
  };
};