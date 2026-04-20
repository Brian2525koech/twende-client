import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api/axios';
import type { Notification } from './types';

// ✅ Always use HTTP (NOT ws://)
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

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

  // ── Fetch all notifications ──────────────────────────────────────────────
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

  // ── Socket connection (FIXED) ────────────────────────────────────────────
  useEffect(() => {
    if (!userId || isNaN(userId)) return;

    // 🛑 Prevent multiple sockets
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 5000,
    });

    socketRef.current = socket;

    // ✅ Connection success
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);

      // 🔥 JOIN ROOM (CRITICAL FIX)
      socket.emit('join:passenger', userId);
    });

    // ❌ Connection error
    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });

    // ⚠️ Disconnect
    socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason);
    });

    // ── Receive notifications ──────────────────────────────────────────────
    socket.on(`passenger:${userId}:notification`, (payload: any) => {
      const incoming: Notification = {
        id: Date.now(),
        user_id: userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      setNotifications(prev => [incoming, ...prev]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  // ── Mark one as read ─────────────────────────────────────────────────────
  const markRead = useCallback(async (id: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );

    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: false } : n))
      );
    }
  }, []);

  // ── Mark all as read ─────────────────────────────────────────────────────
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

  // ── Delete one ───────────────────────────────────────────────────────────
  const remove = useCallback(async (id: number) => {
    const prev = [...notifications];
    setNotifications(p => p.filter(n => n.id !== id));

    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      setNotifications(prev);
    }
  }, [notifications]);

  // ── Clear all ────────────────────────────────────────────────────────────
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