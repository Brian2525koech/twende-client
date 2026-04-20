// src/features/admin/pages/DriversPage/useAdminDrivers.ts
//
// Backend endpoints required:
//
// GET    /api/admin/drivers               → { drivers: DriverRow[] }
// GET    /api/admin/routes                → { routes: RouteOption[] }
// GET    /api/admin/cities                → { cities: CityOption[] }
// POST   /api/admin/drivers               → create driver  { name, email, password, plate_number, route_id, city_id, capacity }
// PATCH  /api/admin/drivers/:id/active    → { is_active: boolean }
// PATCH  /api/admin/drivers/:id/route     → { route_id: number }
// POST   /api/admin/sim/start             → { driver_id, speed_multiplier }
// POST   /api/admin/sim/stop              → { driver_id }
// GET    /api/admin/sim/onboard/:driver_id → { passengers: OnboardPassenger[] }

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api/axios';
import type {
  DriverRow,
  RouteOption,
  CityOption,
  AddDriverForm,
  FilterStatus,
  OnboardPassenger,
} from './types';

interface UseAdminDriversReturn {
  drivers:         DriverRow[];
  filtered:        DriverRow[];
  routes:          RouteOption[];
  cities:          CityOption[];
  loading:         boolean;
  search:          string;
  setSearch:       (v: string) => void;
  statusFilter:    FilterStatus;
  setStatusFilter: (v: FilterStatus) => void;
  cityFilter:      string;
  setCityFilter:   (v: string) => void;
  selectedDriver:  DriverRow | null;
  setSelectedDriver: (d: DriverRow | null) => void;
  onboardMap:      Record<number, OnboardPassenger[]>;
  onboardLoading:  number | null;
  fetchOnboard:    (driverId: number) => Promise<void>;
  startingId:      number | null;
  stoppingId:      number | null;
  selectedSpeed:   Record<number, number>;
  setSpeed:        (driverId: number, speed: number) => void;
  startSim:        (driverId: number) => Promise<void>;
  stopSim:         (driverId: number) => Promise<void>;
  toggleActive:    (driverId: number, current: boolean) => Promise<void>;
  updateRoute:     (driverId: number, routeId: number) => Promise<void>;
  addDriver:       (form: AddDriverForm) => Promise<boolean>;
  refresh:         () => void;
}

export const useAdminDrivers = (): UseAdminDriversReturn => {
  const [drivers,        setDrivers]        = useState<DriverRow[]>([]);
  const [routes,         setRoutes]         = useState<RouteOption[]>([]);
  const [cities,         setCities]         = useState<CityOption[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState<FilterStatus>('all');
  const [cityFilter,     setCityFilter]     = useState('');
  const [selectedDriver, setSelectedDriver] = useState<DriverRow | null>(null);
  const [onboardMap,     setOnboardMap]     = useState<Record<number, OnboardPassenger[]>>({});
  const [onboardLoading, setOnboardLoading] = useState<number | null>(null);
  const [startingId,     setStartingId]     = useState<number | null>(null);
  const [stoppingId,     setStoppingId]     = useState<number | null>(null);
  const [selectedSpeed,  setSelectedSpeed]  = useState<Record<number, number>>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [driversRes, routesRes, citiesRes, simRes] = await Promise.allSettled([
        api.get('/admin/drivers'),
        api.get('/admin/routes'),
        api.get('/admin/cities'),
        api.get('/admin/sim/status'),
      ]);

      const simMap: Record<string, any> =
        simRes.status === 'fulfilled' ? simRes.value.data.simulations ?? {} : {};

      if (driversRes.status === 'fulfilled') {
        const raw = driversRes.value.data.drivers ?? [];
        const list: DriverRow[] = raw.map((d: any) => ({
          user_id:            d.id ?? d.user_id,
          name:               d.name,
          email:              d.email,
          plate_number:       d.plate_number,
          route_id:           d.route_id ?? null,
          route_name:         d.route_name ?? null,
          route_colour:       d.route_colour ?? null,
          city_name:          d.city_name ?? null,
          is_active:          d.is_active,
          average_rating:     parseFloat(d.average_rating) || 0,
          total_trips:        d.total_trips ?? 0,
          capacity:           d.capacity ?? 40,
          vehicle_make:       d.vehicle_make ?? null,
          vehicle_model:      d.vehicle_model ?? null,
          vehicle_year:       d.vehicle_year ?? null,
          vehicle_colour:     d.vehicle_colour ?? null,
          amenities:          d.amenities ?? [],
          matatu_image_url:   d.matatu_image_url ?? null,
          simulation_running: !!simMap[String(d.id ?? d.user_id)],
          last_lat:           d.last_lat ?? null,
          last_lng:           d.last_lng ?? null,
          created_at:         d.created_at ?? '',
        }));
        setDrivers(list);

        // seed speed defaults
        const speeds: Record<number, number> = {};
        list.forEach((d) => { speeds[d.user_id] = 20; });
        setSelectedSpeed(speeds);
      }

      if (routesRes.status === 'fulfilled') {
        setRoutes(routesRes.value.data.routes ?? []);
      }
      if (citiesRes.status === 'fulfilled') {
        setCities(citiesRes.value.data.cities ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Filtered list ─────────────────────────────────────────────────────
  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      d.plate_number.toLowerCase().includes(q) ||
      (d.route_name ?? '').toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'online' && d.is_active) ||
      (statusFilter === 'offline' && !d.is_active);
    const matchCity =
      !cityFilter || (d.city_name ?? '') === cityFilter;
    return matchSearch && matchStatus && matchCity;
  });

  // ── Onboard passengers ────────────────────────────────────────────────
  const fetchOnboard = useCallback(async (driverId: number) => {
    setOnboardLoading(driverId);
    try {
      const res = await api.get(`/admin/sim/onboard/${driverId}`);
      setOnboardMap((prev) => ({
        ...prev,
        [driverId]: res.data.passengers ?? [],
      }));
    } catch {
      // silent
    } finally {
      setOnboardLoading(null);
    }
  }, []);

  const setSpeed = useCallback((driverId: number, speed: number) => {
    setSelectedSpeed((prev) => ({ ...prev, [driverId]: speed }));
  }, []);

  // ── Sim start ─────────────────────────────────────────────────────────
  const startSim = useCallback(async (driverId: number) => {
    setStartingId(driverId);
    const speed = selectedSpeed[driverId] ?? 20;
    const id = toast.loading(`Starting simulation at ${speed}x…`);
    try {
      await api.post('/admin/sim/start', { driver_id: driverId, speed_multiplier: speed });
      setDrivers((prev) =>
        prev.map((d) => d.user_id === driverId ? { ...d, simulation_running: true } : d)
      );
      toast.success('Simulation started', { id });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to start', { id });
    } finally {
      setStartingId(null);
    }
  }, [selectedSpeed]);

  // ── Sim stop ──────────────────────────────────────────────────────────
  const stopSim = useCallback(async (driverId: number) => {
    setStoppingId(driverId);
    const id = toast.loading('Stopping simulation…');
    try {
      await api.post('/admin/sim/stop', { driver_id: driverId });
      setDrivers((prev) =>
        prev.map((d) => d.user_id === driverId ? { ...d, simulation_running: false } : d)
      );
      toast.success('Simulation stopped', { id });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to stop', { id });
    } finally {
      setStoppingId(null);
    }
  }, []);

  // ── Toggle active ─────────────────────────────────────────────────────
  const toggleActive = useCallback(async (driverId: number, current: boolean) => {
    const id = toast.loading(current ? 'Deactivating driver…' : 'Activating driver…');
    try {
      await api.patch(`/admin/drivers/${driverId}/active`, { is_active: !current });
      setDrivers((prev) =>
        prev.map((d) => d.user_id === driverId ? { ...d, is_active: !current } : d)
      );
      // keep side panel in sync
      setSelectedDriver((prev) =>
        prev && prev.user_id === driverId ? { ...prev, is_active: !current } : prev
      );
      toast.success(current ? 'Driver deactivated' : 'Driver activated', { id });
    } catch {
      toast.error('Failed to update status', { id });
    }
  }, []);

  // ── Update route assignment ───────────────────────────────────────────
  const updateRoute = useCallback(async (driverId: number, routeId: number) => {
    const id = toast.loading('Updating route…');
    try {
      await api.patch(`/admin/drivers/${driverId}/route`, { route_id: routeId });
      const route = routes.find((r) => r.id === routeId);
      setDrivers((prev) =>
        prev.map((d) =>
          d.user_id === driverId
            ? { ...d, route_id: routeId, route_name: route?.name ?? null, route_colour: route?.colour ?? null }
            : d
        )
      );
      setSelectedDriver((prev) =>
        prev && prev.user_id === driverId
          ? { ...prev, route_id: routeId, route_name: route?.name ?? null, route_colour: route?.colour ?? null }
          : prev
      );
      toast.success('Route updated', { id });
    } catch {
      toast.error('Failed to update route', { id });
    }
  }, [routes]);

  // ── Add new driver ────────────────────────────────────────────────────
  const addDriver = useCallback(async (form: AddDriverForm): Promise<boolean> => {
    const id = toast.loading('Creating driver account…');
    try {
      await api.post('/admin/drivers', form);
      toast.success('Driver created successfully', { id });
      await loadAll();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create driver', { id });
      return false;
    }
  }, [loadAll]);

  return {
    drivers,
    filtered,
    routes,
    cities,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    cityFilter,
    setCityFilter,
    selectedDriver,
    setSelectedDriver,
    onboardMap,
    onboardLoading,
    fetchOnboard,
    startingId,
    stoppingId,
    selectedSpeed,
    setSpeed,
    startSim,
    stopSim,
    toggleActive,
    updateRoute,
    addDriver,
    refresh: loadAll,
  };
};