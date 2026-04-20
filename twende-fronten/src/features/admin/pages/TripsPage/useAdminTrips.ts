// src/features/admin/pages/TripsPage/useAdminTrips.ts
//
// Backend endpoints required:
//
// GET /api/admin/trips
//   query params: status, payment_status, route_id, date_from, date_to
//   response: { trips: TripRow[], stats: TripStats }
//
// GET /api/admin/routes
//   response: { routes: RouteOption[] }

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api/axios';
import type {
  TripRow,
  TripStats,
  RouteOption,
  StatusFilter,
  PaymentFilter,
  DateRange,
  TripGroup,
} from './types';

function groupByDate(trips: TripRow[]): TripGroup[] {
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });

  const todayStr     = fmt(today);
  const yesterdayStr = fmt(yesterday);

  const map = new Map<string, TripRow[]>();

  for (const trip of trips) {
    const raw   = new Date(trip.date);
    const label = fmt(raw) === todayStr
      ? 'Today'
      : fmt(raw) === yesterdayStr
        ? 'Yesterday'
        : fmt(raw);

    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(trip);
  }

  return Array.from(map.entries()).map(([label, ts]) => ({ label, trips: ts }));
}

interface UseAdminTripsReturn {
  groups:          TripGroup[];
  stats:           TripStats | null;
  routes:          RouteOption[];
  loading:         boolean;
  statusFilter:    StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  paymentFilter:   PaymentFilter;
  setPaymentFilter:(v: PaymentFilter) => void;
  routeFilter:     number | '';
  setRouteFilter:  (v: number | '') => void;
  dateRange:       DateRange;
  setDateRange:    (v: DateRange) => void;
  totalShown:      number;
  refresh:         () => void;
}

export const useAdminTrips = (): UseAdminTripsReturn => {
  const [trips,         setTrips]         = useState<TripRow[]>([]);
  const [stats,         setStats]         = useState<TripStats | null>(null);
  const [routes,        setRoutes]        = useState<RouteOption[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [routeFilter,   setRouteFilter]   = useState<number | ''>('');
  const [dateRange,     setDateRange]     = useState<DateRange>({ from: '', to: '' });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter  !== 'all') params.status         = statusFilter;
      if (paymentFilter !== 'all') params.payment_status = paymentFilter;
      if (routeFilter   !== '')    params.route_id        = String(routeFilter);
      if (dateRange.from)          params.date_from       = dateRange.from;
      if (dateRange.to)            params.date_to         = dateRange.to;

      const [tripsRes, routesRes] = await Promise.allSettled([
        api.get('/admin/trips', { params }),
        api.get('/admin/routes'),
      ]);

      if (tripsRes.status === 'fulfilled') {
        setTrips(tripsRes.value.data.trips  ?? []);
        setStats(tripsRes.value.data.stats  ?? null);
      }
      if (routesRes.status === 'fulfilled') {
        setRoutes(routesRes.value.data.routes ?? []);
      }
    } catch (err) {
      console.error('[AdminTrips] loadAll error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter, routeFilter, dateRange]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const groups = useMemo(() => groupByDate(trips), [trips]);

  return {
    groups,
    stats,
    routes,
    loading,
    statusFilter,
    setStatusFilter,
    paymentFilter,
    setPaymentFilter,
    routeFilter,
    setRouteFilter,
    dateRange,
    setDateRange,
    totalShown: trips.length,
    refresh:    loadAll,
  };
};