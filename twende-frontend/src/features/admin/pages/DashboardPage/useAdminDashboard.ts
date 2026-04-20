// src/features/admin/pages/DashboardPage/useAdminDashboard.ts
//
// Endpoints:
//   GET  /api/admin/stats
//   GET  /api/admin/drivers       (annotated with simulation_active, sim_onboard, sim_progress)
//   GET  /api/admin/sim/status    ({ running_count, simulations: { [driverId]: {...} } })
//   GET  /api/admin/activity
//   POST /api/admin/sim/start     { driver_id, speed_multiplier }
//   POST /api/admin/sim/stop      { driver_id }
//   POST /api/admin/sim/stop-all
//   POST /api/admin/sim/clear-cache { route_id? }

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api/axios';
import type {
  PlatformStats,
  SimDriver,
  WaitingNow,
  RecentTrip,
  RecentRating,
} from './types';

const POLL_MS    = 10_000
const TIMEOUT_MS = 30_000
const RETRY_MS   = 6_000

interface UseAdminDashboardReturn {
  stats:         PlatformStats | null;
  drivers:       SimDriver[];
  waitingNow:    WaitingNow[];
  recentTrips:   RecentTrip[];
  recentRatings: RecentRating[];
  loading:         boolean;
  activityLoading: boolean;
  simLoading:      boolean;
  startingId:    number | null;
  stoppingId:    number | null;
  selectedSpeed: Record<number, number>;
  setSpeed:      (driverId: number, speed: number) => void;
  startSim:      (driverId: number) => Promise<void>;
  stopSim:       (driverId: number) => Promise<void>;
  stopAll:       () => Promise<void>;
  clearCache:    (routeId?: number) => Promise<void>;
  refresh:       () => void;
}

// ── Remap backend onboard_passengers → OnboardPassenger shape ─────────────────
//
// getSimStatus (backend) returns each passenger as:
//   { name, destination, fare, payment_display, is_virtual, paid_via_mpesa }
//
// SimulationPanel reads them as:
//   p.passengerName, p.destinationStopName, p.paidViaMpesa, p.payment_display
//
// types.ts OnboardPassenger uses camelCase — we map here so nothing breaks.
function mapOnboardPassengers(raw: any[]): SimDriver['onboard_passengers'] {
  if (!Array.isArray(raw)) return [];
  return raw.map(p => ({
    passengerId:         p.passenger_id    ?? null,
    passengerName:       p.name            ?? 'Passenger',
    boardedAtStop:       p.boarded_at_stop ?? '',
    destinationStopName: p.destination     ?? null,
    paidViaMpesa:        !!p.paid_via_mpesa,
    payment_display:     p.payment_display ?? (p.paid_via_mpesa ? '✓ M-Pesa' : '⏳ Cash'),
  }));
}

// ── Merge /admin/drivers rows with /admin/sim/status map → SimDriver[] ─────────
//
// /admin/drivers annotates each row with:
//   simulation_active, sim_direction, sim_onboard, sim_progress
//
// /admin/sim/status enriches with:
//   isRunning, progressPercent, currentIndex, totalWaypoints,
//   speedMultiplier, onboard_count (snake_case!), onboard_passengers
//
// Live sim entry takes priority; annotated driver row is the fallback
// so the table is correct immediately on load before first poll fires.
function mergeDriversWithSim(
  rawDrivers: any[],
  simMap: Record<string, any>,
): SimDriver[] {
  return rawDrivers.map((d: any) => {
    const sim = simMap[String(d.id)] ?? null;
    return {
      user_id:          d.id,
      driver_name:      d.name,
      plate_number:     d.plate_number,
      route_id:         d.route_id,
      route_name:       d.route_name,
      route_colour:     d.route_colour,
      city_name:        d.city_name,
      is_active:        d.is_active,
      average_rating:   parseFloat(d.average_rating) || 0,
      last_lat:         d.last_lat,
      last_lng:         d.last_lng,
      simulation_running: sim ? !!sim.isRunning : !!d.simulation_active,
      progress_percent:   sim?.progressPercent ?? d.sim_progress ?? 0,
      current_index:      sim?.currentIndex    ?? 0,
      total_waypoints:    sim?.totalWaypoints  ?? 0,
      speed_multiplier:   sim?.speedMultiplier ?? 20,
      // onboard_count is snake_case in the enriched status response
      onboard_count:      sim?.onboard_count      ?? d.sim_onboard ?? 0,
      onboard_passengers: mapOnboardPassengers(sim?.onboard_passengers ?? []),
    } as SimDriver;
  });
}

export const useAdminDashboard = (): UseAdminDashboardReturn => {
  const [stats,         setStats]         = useState<PlatformStats | null>(null);
  const [drivers,       setDrivers]       = useState<SimDriver[]>([]);
  const [waitingNow,    setWaitingNow]    = useState<WaitingNow[]>([]);
  const [recentTrips,   setRecentTrips]   = useState<RecentTrip[]>([]);
  const [recentRatings, setRecentRatings] = useState<RecentRating[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [simLoading,      setSimLoading]      = useState(false);
  const [startingId,      setStartingId]      = useState<number | null>(null);
  const [stoppingId,      setStoppingId]      = useState<number | null>(null);
  const [selectedSpeed,   setSelectedSpeed]   = useState<Record<number, number>>({});

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // ── Poll sim/status → patch driver list in-place ────────────────────────────
  const fetchSimStatus = useCallback(async () => {
    if (document.visibilityState === 'hidden') return;
    try {
      const res = await api.get('/admin/sim/status', { timeout: TIMEOUT_MS });
      if (!mountedRef.current) return;

      const simMap: Record<string, any> = res.data.simulations ?? {};

      setDrivers(prev =>
        prev.map(d => {
          const sim = simMap[String(d.user_id)];
          if (!sim) {
            return {
              ...d,
              simulation_running: false,
              progress_percent:   0,
              current_index:      0,
              total_waypoints:    0,
              speed_multiplier:   selectedSpeed[d.user_id] ?? 20,
              onboard_count:      0,
              onboard_passengers: [],
            };
          }
          return {
            ...d,
            simulation_running: true,
            progress_percent:   sim.progressPercent ?? 0,
            current_index:      sim.currentIndex    ?? 0,
            total_waypoints:    sim.totalWaypoints  ?? 0,
            speed_multiplier:   sim.speedMultiplier ?? 20,
            onboard_count:      sim.onboard_count      ?? 0,
            onboard_passengers: mapOnboardPassengers(sim.onboard_passengers ?? []),
          };
        })
      );

      if (typeof res.data.running_count === 'number') {
        setStats(prev =>
          prev ? { ...prev, running_sims: res.data.running_count } : prev
        );
      }
    } catch { /* non-fatal */ }
  }, [selectedSpeed]);

  // ── Initialise speed defaults for new drivers ───────────────────────────────
  useEffect(() => {
    if (drivers.length === 0) return;
    setSelectedSpeed(prev => {
      const next    = { ...prev };
      let   changed = false;
      drivers.forEach(d => {
        if (!(d.user_id in next)) { next[d.user_id] = 20; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [drivers]);

  // ── Main load (two-phase) ───────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setActivityLoading(true);

    const [statsRes, driversRes, simRes] = await Promise.allSettled([
      api.get('/admin/stats',      { timeout: TIMEOUT_MS }),
      api.get('/admin/drivers',    { timeout: TIMEOUT_MS }),
      api.get('/admin/sim/status', { timeout: TIMEOUT_MS }),
    ]);

    if (!mountedRef.current) return;

    if (statsRes.status === 'fulfilled') {
      setStats(statsRes.value.data);
    } else {
      console.warn('[AdminDashboard] /stats failed:', statsRes.reason?.message);
      setTimeout(async () => {
        if (!mountedRef.current) return;
        try {
          const retry = await api.get('/admin/stats', { timeout: TIMEOUT_MS });
          if (mountedRef.current) setStats(retry.data);
        } catch { /* leave null */ }
      }, RETRY_MS);
    }

    if (driversRes.status === 'fulfilled') {
      const simMap: Record<string, any> =
        simRes.status === 'fulfilled' ? (simRes.value.data.simulations ?? {}) : {};
      setDrivers(mergeDriversWithSim(driversRes.value.data.drivers ?? [], simMap));
    } else {
      console.warn('[AdminDashboard] /drivers failed:', driversRes.reason?.message);
    }

    setLoading(false);

    // Phase 2: activity feed
    try {
      const activityRes = await api.get('/admin/activity', { timeout: TIMEOUT_MS });
      if (!mountedRef.current) return;
      const a = activityRes.data;
      setWaitingNow(a.waiting    ?? []);
      setRecentTrips(a.trips     ?? []);
      setRecentRatings(a.ratings ?? []);
    } catch {
      if (mountedRef.current) {
        setWaitingNow([]);
        setRecentTrips([]);
        setRecentRatings([]);
      }
    } finally {
      if (mountedRef.current) setActivityLoading(false);
    }
  }, []);

  // ── Mount / cleanup ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    loadAll();
    pollRef.current = setInterval(fetchSimStatus, POLL_MS);
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSpeed = useCallback((driverId: number, speed: number) => {
    setSelectedSpeed(prev => ({ ...prev, [driverId]: speed }));
  }, []);

  // ── Start ───────────────────────────────────────────────────────────────────
  const startSim = useCallback(async (driverId: number) => {
    setStartingId(driverId);
    const speed = selectedSpeed[driverId] ?? 20;
    const id    = toast.loading(`Starting simulation at ${speed}x speed…`);
    try {
      const res = await api.post('/admin/sim/start', {
        driver_id: driverId, speed_multiplier: speed,
      }, { timeout: TIMEOUT_MS });
      if (!mountedRef.current) return;
      setDrivers(prev =>
        prev.map(d => d.user_id === driverId
          ? { ...d, simulation_running: true, progress_percent: 0 } : d)
      );
      setStats(prev =>
        prev ? { ...prev, running_sims: (prev.running_sims ?? 0) + 1 } : prev
      );
      toast.success(res.data.message ?? 'Simulation started', { id });
    } catch (err: any) {
      toast.error(
        err.code === 'ECONNABORTED'
          ? 'Request timed out — check your connection'
          : (err.response?.data?.message ?? 'Failed to start simulation'),
        { id }
      );
    } finally {
      if (mountedRef.current) setStartingId(null);
    }
  }, [selectedSpeed]);

  // ── Stop ────────────────────────────────────────────────────────────────────
  const stopSim = useCallback(async (driverId: number) => {
    setStoppingId(driverId);
    const id = toast.loading('Stopping simulation…');
    try {
      await api.post('/admin/sim/stop', { driver_id: driverId }, { timeout: TIMEOUT_MS });
      if (!mountedRef.current) return;
      setDrivers(prev =>
        prev.map(d => d.user_id === driverId
          ? { ...d, simulation_running: false, progress_percent: 0, onboard_count: 0, onboard_passengers: [] }
          : d)
      );
      setStats(prev =>
        prev ? { ...prev, running_sims: Math.max(0, (prev.running_sims ?? 1) - 1) } : prev
      );
      toast.success('Simulation stopped', { id });
    } catch (err: any) {
      toast.error(
        err.code === 'ECONNABORTED'
          ? 'Request timed out — check your connection'
          : (err.response?.data?.message ?? 'Failed to stop'),
        { id }
      );
    } finally {
      if (mountedRef.current) setStoppingId(null);
    }
  }, []);

  // ── Stop all ────────────────────────────────────────────────────────────────
  const stopAll = useCallback(async () => {
    const id = toast.loading('Stopping all simulations…');
    try {
      await api.post('/admin/sim/stop-all', {}, { timeout: TIMEOUT_MS });
      if (!mountedRef.current) return;
      setDrivers(prev =>
        prev.map(d => ({ ...d, simulation_running: false, progress_percent: 0, onboard_count: 0, onboard_passengers: [] }))
      );
      setStats(prev => prev ? { ...prev, running_sims: 0 } : prev);
      toast.success('All simulations stopped', { id });
    } catch (err: any) {
      toast.error(
        err.code === 'ECONNABORTED' ? 'Request timed out' : 'Failed to stop all',
        { id }
      );
    }
  }, []);

  // ── Clear cache ─────────────────────────────────────────────────────────────
  const clearCache = useCallback(async (routeId?: number) => {
    const id = toast.loading(
      routeId ? `Clearing cache for route ${routeId}…` : 'Clearing all route caches…'
    );
    try {
      await api.post(
        '/admin/sim/clear-cache',
        routeId ? { route_id: routeId } : {},
        { timeout: TIMEOUT_MS }
      );
      toast.success('Cache cleared — routes will regenerate on next sim start', { id });
    } catch {
      toast.error('Failed to clear cache', { id });
    }
  }, []);

  return {
    stats,
    drivers,
    waitingNow,
    recentTrips,
    recentRatings,
    loading,
    activityLoading,
    simLoading,
    startingId,
    stoppingId,
    selectedSpeed,
    setSpeed,
    startSim,
    stopSim,
    stopAll,
    clearCache,
    refresh: loadAll,
  };
};