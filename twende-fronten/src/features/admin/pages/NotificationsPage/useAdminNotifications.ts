// src/features/admin/pages/NotificationsPage/useAdminNotifications.ts
//
// Backend endpoints required:
//
// GET  /api/admin/users/search?q=          → { users: UserSearchResult[] }
// GET  /api/admin/routes                   → { routes: RouteOption[] }
// GET  /api/admin/notifications/broadcasts → { broadcasts: BroadcastRecord[] }
// POST /api/admin/notifications/user       → { user_id, title, message, type }
// POST /api/admin/notifications/route      → { route_id, title, message, type }
// POST /api/admin/notifications/drivers    → { title, message, type }

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api/axios';
import type {
  UserSearchResult,
  RouteOption,
  BroadcastRecord,
  SendToUserForm,
  SendToRouteForm,
  SendToDriversForm,
  SendMode,
} from './types';

const EMPTY_USER_FORM: SendToUserForm = {
  user_id: null, title: '', message: '', type: 'info',
};
const EMPTY_ROUTE_FORM: SendToRouteForm = {
  route_id: '', title: '', message: '', type: 'info',
};
const EMPTY_DRIVERS_FORM: SendToDriversForm = {
  title: '', message: '', type: 'info',
};

interface UseAdminNotificationsReturn {
  activeMode:       SendMode;
  setActiveMode:    (m: SendMode) => void;
  routes:           RouteOption[];
  broadcasts:       BroadcastRecord[];
  broadcastsLoading: boolean;
  // user search
  userQuery:        string;
  setUserQuery:     (v: string) => void;
  userResults:      UserSearchResult[];
  userSearching:    boolean;
  selectedUser:     UserSearchResult | null;
  setSelectedUser:  (u: UserSearchResult | null) => void;
  // forms
  userForm:         SendToUserForm;
  setUserForm:      (f: SendToUserForm) => void;
  routeForm:        SendToRouteForm;
  setRouteForm:     (f: SendToRouteForm) => void;
  driversForm:      SendToDriversForm;
  setDriversForm:   (f: SendToDriversForm) => void;
  // send actions
  sendToUser:       () => Promise<void>;
  sendToRoute:      () => Promise<void>;
  sendToDrivers:    () => Promise<void>;
  sending:          boolean;
  refresh:          () => void;
}

export const useAdminNotifications = (): UseAdminNotificationsReturn => {
  const [activeMode,        setActiveMode]        = useState<SendMode>('user');
  const [routes,            setRoutes]            = useState<RouteOption[]>([]);
  const [broadcasts,        setBroadcasts]        = useState<BroadcastRecord[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(true);
  const [userQuery,         setUserQuery]         = useState('');
  const [userResults,       setUserResults]       = useState<UserSearchResult[]>([]);
  const [userSearching,     setUserSearching]     = useState(false);
  const [selectedUser,      setSelectedUser]      = useState<UserSearchResult | null>(null);
  const [userForm,          setUserForm]          = useState<SendToUserForm>(EMPTY_USER_FORM);
  const [routeForm,         setRouteForm]         = useState<SendToRouteForm>(EMPTY_ROUTE_FORM);
  const [driversForm,       setDriversForm]       = useState<SendToDriversForm>(EMPTY_DRIVERS_FORM);
  const [sending,           setSending]           = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bootstrap ────────────────────────────────────────────────────────
  const loadBootstrap = useCallback(async () => {
    setBroadcastsLoading(true);
    try {
      const [routesRes, broadcastsRes] = await Promise.allSettled([
        api.get('/admin/routes'),
        api.get('/admin/notifications/broadcasts'),
      ]);
      if (routesRes.status === 'fulfilled') {
        setRoutes(routesRes.value.data.routes ?? []);
      }
      if (broadcastsRes.status === 'fulfilled') {
        setBroadcasts(broadcastsRes.value.data.broadcasts ?? []);
      }
    } finally {
      setBroadcastsLoading(false);
    }
  }, []);

  useEffect(() => { loadBootstrap(); }, [loadBootstrap]);

  // ── User search with debounce ─────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!userQuery.trim()) {
      setUserResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setUserSearching(true);
      try {
        const res = await api.get('/admin/users/search', { params: { q: userQuery } });
        setUserResults(res.data.users ?? []);
      } catch {
        setUserResults([]);
      } finally {
        setUserSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userQuery]);

  // ── Send to single user ───────────────────────────────────────────────
  const sendToUser = useCallback(async () => {
    if (!userForm.user_id || !userForm.title.trim() || !userForm.message.trim()) {
      toast.error('Pick a user and fill in title + message');
      return;
    }
    setSending(true);
    const id = toast.loading('Sending notification…');
    try {
      const res = await api.post('/admin/notifications/user', userForm);
      toast.success(res.data.message ?? 'Notification sent', { id });
      setUserForm(EMPTY_USER_FORM);
      setSelectedUser(null);
      setUserQuery('');
      await loadBootstrap();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send';
      toast.error(msg, { id });
    } finally {
      setSending(false);
    }
  }, [userForm, loadBootstrap]);

  // ── Send to route passengers ──────────────────────────────────────────
  const sendToRoute = useCallback(async () => {
    if (!routeForm.route_id || !routeForm.title.trim() || !routeForm.message.trim()) {
      toast.error('Select a route and fill in title + message');
      return;
    }
    setSending(true);
    const id = toast.loading('Broadcasting to route passengers…');
    try {
      const res = await api.post('/admin/notifications/route', routeForm);
      toast.success(res.data.message ?? 'Broadcast sent', { id });
      setRouteForm(EMPTY_ROUTE_FORM);
      await loadBootstrap();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send';
      toast.error(msg, { id });
    } finally {
      setSending(false);
    }
  }, [routeForm, loadBootstrap]);

  // ── Send to all drivers ───────────────────────────────────────────────
  const sendToDrivers = useCallback(async () => {
    if (!driversForm.title.trim() || !driversForm.message.trim()) {
      toast.error('Fill in title + message');
      return;
    }
    setSending(true);
    const id = toast.loading('Broadcasting to all drivers…');
    try {
      const res = await api.post('/admin/notifications/drivers', driversForm);
      toast.success(res.data.message ?? 'Broadcast sent', { id });
      setDriversForm(EMPTY_DRIVERS_FORM);
      await loadBootstrap();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send';
      toast.error(msg, { id });
    } finally {
      setSending(false);
    }
  }, [driversForm, loadBootstrap]);

  return {
    activeMode, setActiveMode,
    routes,
    broadcasts, broadcastsLoading,
    userQuery, setUserQuery,
    userResults, userSearching,
    selectedUser, setSelectedUser,
    userForm, setUserForm,
    routeForm, setRouteForm,
    driversForm, setDriversForm,
    sendToUser, sendToRoute, sendToDrivers,
    sending,
    refresh: loadBootstrap,
  };
};