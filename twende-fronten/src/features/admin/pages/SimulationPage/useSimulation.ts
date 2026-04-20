// src/features/admin/pages/SimulationPage/useSimulation.ts
//
// Backend endpoints used by this page:
//
// GET  /api/admin/drivers
//   Returns { drivers: [...] } — all drivers with basic profile info
//
// GET  /api/admin/sim/status
//   Returns { simulations: Record<driverId, SimStatus> }
//   (already exists in adminController.ts → getSimulationStatus)
//
// GET  /api/admin/sim/passengers/:driver_id
//   Returns { driver_id, simulation_active, onboard_count, passengers }
//   (already exists → getSimOnboardPassengers)
//
// GET  /api/admin/sim/route/:route_id
//   Returns { route_id, waypoints, stops, waypoint_count }
//   (already exists → getRouteGeometryForSim)
//
// POST /api/admin/sim/start
//   Body: { driver_id, speed_multiplier }
//
// POST /api/admin/sim/stop
//   Body: { driver_id }
//
// POST /api/admin/sim/stop-all
//
// POST /api/admin/sim/clear-cache
//   Body: { route_id? }

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api/axios';
import type { DriverRow, SimStatus, OnboardPassenger } from './types';

const POLL_INTERVAL_MS = 4000;

interface UseSimulationReturn {
  drivers:        DriverRow[];
  loading:        boolean;
  polling:        boolean;
  startingId:     number | null;
  stoppingId:     number | null;
  selectedSpeed:  Record<number, number>;
  setSpeed:       (driverId: number, speed: number) => void;
  startSim:       (driverId: number) => Promise<void>;
  stopSim:        (driverId: number) => Promise<void>;
  stopAll:        () => Promise<void>;
  clearCache:     (routeId?: number) => Promise<void>;
  toggleMap:      (driverId: number) => void;
  refresh:        () => Promise<void>;
}

export const useSimulation = (): UseSimulationReturn => {
  const [drivers,       setDrivers]       = useState<DriverRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [polling,       setPolling]       = useState(false);
  const [startingId,    setStartingId]    = useState<number | null>(null);
  const [stoppingId,    setStoppingId]    = useState<number | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState<Record<number, number>>({});

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted  = useRef(true);

  // ── Build driver list from /admin/drivers + /admin/sim/status ─────────
  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const [driversRes, simRes] = await Promise.allSettled([
        api.get('/admin/drivers'),
        api.get('/admin/sim/status'),
      ]);

      const rawDrivers = driversRes.status === 'fulfilled'
        ? (driversRes.value.data.drivers ?? [])
        : [];

      const simMap: Record<string, SimStatus> =
        simRes.status === 'fulfilled'
          ? (simRes.value.data.simulations ?? {})
          : {};

      const rows: DriverRow[] = rawDrivers.map((d: any) => {
        const sim = simMap[String(d.id)] ?? null;
        return {
          user_id:        d.id,
          driver_name:    d.name,
          email:          d.email ?? '',
          plate_number:   d.plate_number,
          route_id:       d.route_id,
          route_name:     d.route_name,
          route_colour:   d.route_colour,
          city_name:      d.city_name,
          is_active:      d.is_active,
          average_rating: parseFloat(d.average_rating) || 0,
          last_lat:       d.last_lat,
          last_lng:       d.last_lng,
          sim,
          onboard:        [],
          waypoints:      [],
          stops:          [],
          mapExpanded:    false,
        };
      });

      if (mounted.current) {
        setDrivers(rows);
        // Initialise speed selectors
        setSelectedSpeed(prev => {
          const next = { ...prev };
          rows.forEach(r => { if (!next[r.user_id]) next[r.user_id] = 20; });
          return next;
        });
      }
    } catch (err) {
      console.error('[useSimulation] loadDrivers error:', err);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  // ── Poll sim status ────────────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    setPolling(true);
    try {
      const res = await api.get('/admin/sim/status');
      const simMap: Record<string, SimStatus> = res.data.simulations ?? {};

      if (!mounted.current) return;

      setDrivers(prev => prev.map(d => ({
        ...d,
        sim: simMap[String(d.user_id)] ?? null,
        is_active: !!simMap[String(d.user_id)],
      })));

      // Refresh onboard for running sims
      const runningIds = Object.keys(simMap).map(Number);
      for (const id of runningIds) {
        try {
          const pRes = await api.get(`/admin/sim/passengers/${id}`);
          if (!mounted.current) return;
          const passengers: OnboardPassenger[] = pRes.data.passengers ?? [];
          setDrivers(prev => prev.map(d =>
            d.user_id === id ? { ...d, onboard: passengers } : d
          ));
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      console.error('[useSimulation] poll error:', err);
    } finally {
      if (mounted.current) setPolling(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadDrivers();
    pollRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadDrivers, pollStatus]);

  const setSpeed = useCallback((driverId: number, speed: number) => {
    setSelectedSpeed(prev => ({ ...prev, [driverId]: speed }));
  }, []);

  // ── Toggle map (loads waypoints on first expand) ───────────────────────
  const toggleMap = useCallback(async (driverId: number) => {
    setDrivers(prev => prev.map(d => {
      if (d.user_id !== driverId) return d;
      const expanding = !d.mapExpanded;
      // Load waypoints if not yet loaded
      if (expanding && d.waypoints.length === 0 && d.route_id) {
        api.get(`/admin/sim/route/${d.route_id}`)
          .then(res => {
            if (!mounted.current) return;
            setDrivers(p => p.map(r =>
              r.user_id === driverId
                ? { ...r, waypoints: res.data.waypoints ?? [], stops: res.data.stops ?? [] }
                : r
            ));
          })
          .catch(err => console.warn('Route geometry load failed:', err));
      }
      return { ...d, mapExpanded: expanding };
    }));
  }, []);

  // ── Start simulation ───────────────────────────────────────────────────
  const startSim = useCallback(async (driverId: number) => {
    const speed = selectedSpeed[driverId] ?? 20;
    setStartingId(driverId);
    const id = toast.loading(`Starting simulation at ${speed}× speed…`);
    try {
      const res = await api.post('/admin/sim/start', {
        driver_id:        driverId,
        speed_multiplier: speed,
      });
      toast.success(res.data.message ?? 'Simulation started ✓', { id, duration: 4000 });
      // Immediately refresh status
      await pollStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to start simulation', { id });
    } finally {
      setStartingId(null);
    }
  }, [selectedSpeed, pollStatus]);

  // ── Stop simulation ────────────────────────────────────────────────────
  const stopSim = useCallback(async (driverId: number) => {
    setStoppingId(driverId);
    const id = toast.loading('Stopping simulation…');
    try {
      await api.post('/admin/sim/stop', { driver_id: driverId });
      toast.success('Simulation stopped', { id });
      setDrivers(prev => prev.map(d =>
        d.user_id === driverId
          ? { ...d, sim: null, is_active: false, onboard: [] }
          : d
      ));
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to stop simulation', { id });
    } finally {
      setStoppingId(null);
    }
  }, []);

  // ── Stop all ───────────────────────────────────────────────────────────
  const stopAll = useCallback(async () => {
    const id = toast.loading('Stopping all simulations…');
    try {
      await api.post('/admin/sim/stop-all');
      toast.success('All simulations stopped', { id });
      setDrivers(prev => prev.map(d => ({ ...d, sim: null, is_active: false, onboard: [] })));
    } catch {
      toast.error('Failed to stop all', { id });
    }
  }, []);

  // ── Clear cache ────────────────────────────────────────────────────────
  const clearCache = useCallback(async (routeId?: number) => {
    const id = toast.loading(routeId ? `Clearing cache for route ${routeId}…` : 'Clearing all route caches…');
    try {
      await api.post('/admin/sim/clear-cache', routeId ? { route_id: routeId } : {});
      // Clear locally stored waypoints so they re-fetch
      setDrivers(prev => prev.map(d =>
        !routeId || d.route_id === routeId
          ? { ...d, waypoints: [], stops: [] }
          : d
      ));
      toast.success('Cache cleared — next sim start will regenerate OSRM path', { id });
    } catch {
      toast.error('Failed to clear cache', { id });
    }
  }, []);

  return {
    drivers, loading, polling,
    startingId, stoppingId, selectedSpeed,
    setSpeed, startSim, stopSim, stopAll, clearCache,
    toggleMap, refresh: loadDrivers,
  };
};