// src/features/admin/pages/RoutesPage/useAdminRoutes.ts
//
// Backend endpoints this hook requires:
//
// GET    /api/admin/routes              → { routes: AdminRoute[] }
// GET    /api/admin/cities              → { cities: City[] }
// GET    /api/admin/routes/:id/stops    → { stops: RouteStop[] }
// GET    /api/admin/sim/route/:route_id → { geometry: [lat,lng][] }  (OSRM preview)
// POST   /api/admin/routes              → create route
// PUT    /api/admin/routes/:id          → edit route
// DELETE /api/admin/routes/:id          → delete route
// POST   /api/admin/routes/:id/stops    → add stop
// PUT    /api/admin/stops/:stop_id      → edit stop
// DELETE /api/admin/stops/:stop_id      → delete stop
// PUT    /api/admin/stops/:stop_id/reorder → { order_index: number }

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api/axios';
import type { AdminRoute, City, RouteStop, RouteFormData, StopFormData } from './types';

interface UseAdminRoutesReturn {
  routes: AdminRoute[];
  cities: City[];
  loading: boolean;
  expandedRouteId: number | null;
  stopsLoading: boolean;
  routeGeometry: Record<number, [number, number][]>;
  geometryLoading: number | null;
  cityFilter: string;
  setCityFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  toggleExpand: (routeId: number) => void;
  createRoute: (data: RouteFormData) => Promise<boolean>;
  updateRoute: (routeId: number, data: RouteFormData) => Promise<boolean>;
  deleteRoute: (routeId: number) => Promise<void>;
  addStop: (routeId: number, data: StopFormData) => Promise<boolean>;
  updateStop: (stopId: number, routeId: number, data: StopFormData) => Promise<boolean>;
  deleteStop: (stopId: number, routeId: number) => Promise<void>;
  reorderStop: (stopId: number, routeId: number, direction: 'up' | 'down') => Promise<void>;
  loadGeometry: (routeId: number) => Promise<void>;
  refresh: () => void;
  filteredRoutes: AdminRoute[];
}

export const useAdminRoutes = (): UseAdminRoutesReturn => {
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRouteId, setExpandedRouteId] = useState<number | null>(null);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<Record<number, [number, number][]>>({});
  const [geometryLoading, setGeometryLoading] = useState<number | null>(null);
  const [cityFilter, setCityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [routesRes, citiesRes] = await Promise.allSettled([
        api.get('/admin/routes'),
        api.get('/admin/cities'),
      ]);

      if (routesRes.status === 'fulfilled') {
        setRoutes(routesRes.value.data.routes ?? []);
      }
      if (citiesRes.status === 'fulfilled') {
        setCities(citiesRes.value.data.cities ?? []);
      }
    } catch (err) {
      console.error('[AdminRoutes] loadAll error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadStops = useCallback(async (routeId: number) => {
    setStopsLoading(true);
    try {
      const res = await api.get(`/admin/routes/${routeId}/stops`);
      const stops: RouteStop[] = res.data.stops ?? [];
      setRoutes((prev) =>
        prev.map((r) => (r.id === routeId ? { ...r, stops } : r))
      );
    } catch {
      toast.error('Failed to load stops');
    } finally {
      setStopsLoading(false);
    }
  }, []);

  const toggleExpand = useCallback(
    (routeId: number) => {
      setExpandedRouteId((prev) => {
        if (prev === routeId) return null;
        // Load stops when expanding
        loadStops(routeId);
        return routeId;
      });
    },
    [loadStops]
  );

  const loadGeometry = useCallback(async (routeId: number) => {
    if (routeGeometry[routeId]) return; // already cached
    setGeometryLoading(routeId);
    try {
      const res = await api.get(`/admin/sim/route/${routeId}`);
      setRouteGeometry((prev) => ({
        ...prev,
        [routeId]: res.data.geometry ?? [],
      }));
    } catch {
      toast.error('Failed to load route geometry');
    } finally {
      setGeometryLoading(null);
    }
  }, [routeGeometry]);

  // ── Route CRUD ──────────────────────────────────────────────────────────
  const createRoute = useCallback(async (data: RouteFormData): Promise<boolean> => {
    const id = toast.loading('Creating route…');
    try {
      const res = await api.post('/admin/routes', data);
      const newRoute: AdminRoute = {
        ...res.data.route,
        stop_count: 0,
        active_driver_count: 0,
        stops: [],
      };
      setRoutes((prev) => [newRoute, ...prev]);
      toast.success('Route created', { id });
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create route', { id });
      return false;
    }
  }, []);

  const updateRoute = useCallback(async (routeId: number, data: RouteFormData): Promise<boolean> => {
    const id = toast.loading('Updating route…');
    try {
      await api.put(`/admin/routes/${routeId}`, data);
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === routeId
            ? {
                ...r,
                name: data.name,
                colour: data.colour,
                city_id: data.city_id as number,
                description: data.description,
              }
            : r
        )
      );
      toast.success('Route updated', { id });
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to update route', { id });
      return false;
    }
  }, []);

  const deleteRoute = useCallback(async (routeId: number) => {
    const id = toast.loading('Deleting route…');
    try {
      await api.delete(`/admin/routes/${routeId}`);
      setRoutes((prev) => prev.filter((r) => r.id !== routeId));
      if (expandedRouteId === routeId) setExpandedRouteId(null);
      toast.success('Route deleted', { id });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to delete route', { id });
    }
  }, [expandedRouteId]);

  // ── Stop CRUD ───────────────────────────────────────────────────────────
  const addStop = useCallback(async (routeId: number, data: StopFormData): Promise<boolean> => {
    const id = toast.loading('Adding stop…');
    try {
      const res = await api.post(`/admin/routes/${routeId}/stops`, {
        name: data.name,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
      });
      const newStop: RouteStop = res.data.stop;
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === routeId
            ? {
                ...r,
                stop_count: r.stop_count + 1,
                stops: [...(r.stops ?? []), newStop],
              }
            : r
        )
      );
      toast.success('Stop added', { id });
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to add stop', { id });
      return false;
    }
  }, []);

  const updateStop = useCallback(
    async (stopId: number, routeId: number, data: StopFormData): Promise<boolean> => {
      const id = toast.loading('Updating stop…');
      try {
        await api.put(`/admin/stops/${stopId}`, {
          name: data.name,
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lng),
        });
        setRoutes((prev) =>
          prev.map((r) =>
            r.id === routeId
              ? {
                  ...r,
                  stops: (r.stops ?? []).map((s) =>
                    s.id === stopId
                      ? { ...s, name: data.name, lat: parseFloat(data.lat), lng: parseFloat(data.lng) }
                      : s
                  ),
                }
              : r
          )
        );
        toast.success('Stop updated', { id });
        return true;
      } catch (err: any) {
        toast.error(err.response?.data?.message ?? 'Failed to update stop', { id });
        return false;
      }
    },
    []
  );

  const deleteStop = useCallback(async (stopId: number, routeId: number) => {
    const id = toast.loading('Deleting stop…');
    try {
      await api.delete(`/admin/stops/${stopId}`);
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === routeId
            ? {
                ...r,
                stop_count: Math.max(0, r.stop_count - 1),
                stops: (r.stops ?? []).filter((s) => s.id !== stopId),
              }
            : r
        )
      );
      toast.success('Stop removed', { id });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to delete stop', { id });
    }
  }, []);

  const reorderStop = useCallback(
    async (stopId: number, routeId: number, direction: 'up' | 'down') => {
      const route = routes.find((r) => r.id === routeId);
      if (!route?.stops) return;

      const stops = [...route.stops].sort((a, b) => a.order_index - b.order_index);
      const idx = stops.findIndex((s) => s.id === stopId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= stops.length) return;

      // Optimistic UI swap
      const newStops = [...stops];
      const tempOrder = newStops[idx].order_index;
      newStops[idx] = { ...newStops[idx], order_index: newStops[swapIdx].order_index };
      newStops[swapIdx] = { ...newStops[swapIdx], order_index: tempOrder };

      setRoutes((prev) =>
        prev.map((r) => (r.id === routeId ? { ...r, stops: newStops } : r))
      );

      try {
        await api.put(`/admin/stops/${stopId}/reorder`, {
          order_index: newStops[idx].order_index,
        });
      } catch {
        // Revert on failure
        loadStops(routeId);
        toast.error('Reorder failed');
      }
    },
    [routes, loadStops]
  );

  const filteredRoutes = routes.filter((r) => {
    const matchesCity = cityFilter === 'all' || String(r.city_id) === cityFilter;
    const matchesSearch =
      !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.city_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesSearch;
  });

  return {
    routes,
    cities,
    loading,
    expandedRouteId,
    stopsLoading,
    routeGeometry,
    geometryLoading,
    cityFilter,
    setCityFilter,
    searchQuery,
    setSearchQuery,
    toggleExpand,
    createRoute,
    updateRoute,
    deleteRoute,
    addStop,
    updateStop,
    deleteStop,
    reorderStop,
    loadGeometry,
    refresh: loadAll,
    filteredRoutes,
  };
};