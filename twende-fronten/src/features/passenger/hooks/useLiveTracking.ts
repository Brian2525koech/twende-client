// src/features/passenger/hooks/useLiveTracking.ts
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { fetchRouteCoordinates, fetchLiveDrivers, fetchRouteStops } from '@/lib/api/routesApi';
import type { Driver, Stop } from '../pages/MapPage/types';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Waypoint {
  lat: number | string;
  lng: number | string;
}

interface MatatuMovedPayload {
  driver_id: number;
  driver_name: string;
  profile_image_url: string | null;
  plate_number: string;
  route_id: number;
  average_rating: number;
  lat: number;
  lng: number;
  speed: number;
  passengers: number;
  is_waiting: boolean;
  stops_eta: {
    id: number;
    name: string;
    lat: number;
    lng: number;
    eta_minutes: number;
  }[];
  timestamp: string;
  simulated: boolean;
}

// ── Return Type ───────────────────────────────────────────────────────────────
export interface UseLiveTrackingReturn {
  drivers: Driver[];
  routePath: [number, number][];
  stops: Stop[];
  loading: boolean;
  socketConnected: boolean;
  socket: Socket | null;
}

// ── Socket URL ─────────────────────────────────────────────────────────────────
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

// ── Hook ───────────────────────────────────────────────────────────────────────
export const useLiveTracking = (
  routeId: string | undefined
): UseLiveTrackingReturn => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!routeId) return;

    // ── 1. Load static route data once ────────────────────────────────────
    const loadRouteData = async () => {
      try {
        setLoading(true);
        const [coords, routeStops, initialDrivers] = await Promise.all([
          fetchRouteCoordinates(routeId),
          fetchRouteStops(routeId),
          fetchLiveDrivers(routeId),
        ]);

        if (coords && coords.length > 0) {
          const formattedPath = coords.map(
            (p: Waypoint) => [Number(p.lat), Number(p.lng)] as [number, number]
          );
          setRoutePath(formattedPath);
        }

        setStops(routeStops || []);
        setDrivers(initialDrivers || []);
      } catch (err) {
        console.error('Route data load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRouteData();

    // ── 2. Connect Socket.IO ───────────────────────────────────────────────
    console.log('Connecting socket to:', SOCKET_URL);

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setSocketConnected(true);
      socket.emit('join:route', parseInt(routeId));
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setSocketConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    // ── 3. Listen for live driver positions ────────────────────────────────
    socket.on('matatu:moved', (payload: MatatuMovedPayload) => {
      if (String(payload.route_id) !== String(routeId)) return;

      setDrivers((prev) => {
        const existingIndex = prev.findIndex(
          (d) => d.user_id === payload.driver_id || d.driver_id === payload.driver_id
        );

        // Transform stops_eta to match StopETA (adds missing order_index)
        const stopsEta: Driver['stops_eta'] = payload.stops_eta.map((eta, idx) => ({
          id: eta.id,
          name: eta.name,
          lat: eta.lat,
          lng: eta.lng,
          eta_minutes: eta.eta_minutes,
          order_index: (eta as any).order_index ?? idx, // fallback
          is_upcoming: false,
        }));

        const updated: Driver = {
          ...(existingIndex >= 0 ? prev[existingIndex] : {}),
          user_id: payload.driver_id,
          driver_id: payload.driver_id,
          driver_name: payload.driver_name,
          plate_number: payload.plate_number,
          average_rating: payload.average_rating,
          latitude: payload.lat,
          longitude: payload.lng,
          speed: payload.speed,
          passengers: payload.passengers,
          is_waiting: payload.is_waiting,
          stops_eta: stopsEta,
          last_updated: payload.timestamp,
          simulated: payload.simulated,
        };

        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = updated;
          return next;
        }
        return [...prev, updated];
      });
    });

    // ── 4. HTTP fallback poll ──────────────────────────────────────────────
    const fallbackInterval = setInterval(async () => {
      if (socket.connected) return;
      try {
        const activeDrivers = await fetchLiveDrivers(routeId);
        if (activeDrivers) setDrivers(activeDrivers);
      } catch {
        // Silent fail
      }
    }, 10000);

    return () => {
      socket.emit('leave:route', parseInt(routeId));
      socket.disconnect();
      socketRef.current = null;
      clearInterval(fallbackInterval);
    };
  }, [routeId]);

  return {
    drivers,
    routePath,
    stops,
    loading,
    socketConnected,
    socket: socketRef.current,
  };
};