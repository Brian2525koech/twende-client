// src/features/driver/pages/TripsPage/useDriverTrips.ts
//
// ════════════════════════════════════════════════════════════════════
// BACKEND REQUIREMENTS — build these endpoints to power this page:
//
// GET /api/driver/trips
//   Query params: ?status=all|completed|cancelled|ongoing
//                 ?page=1&limit=30
//                 ?search=<passenger_name or route_name>
//                 ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
//   Returns: { trips: DriverTrip[], total: number, page: number, pages: number }
//   SQL (driver_id = req.user.id):
//     SELECT t.*, u.name AS passenger_name,
//            r.colour AS route_colour
//     FROM trips t
//     LEFT JOIN users u   ON u.id = t.passenger_id
//     LEFT JOIN routes r  ON r.id = t.route_id
//     WHERE t.driver_id = $driverId
//       AND ($status = 'all' OR t.status = $status)
//       AND (t.from_stop ILIKE $search OR t.route_name ILIKE $search
//            OR u.name ILIKE $search)
//     ORDER BY t.date DESC, t.created_at DESC
//     LIMIT $limit OFFSET ($page-1)*$limit
//
// GET /api/driver/trips/stats
//   Returns: TripStats
//   SQL:
//     SELECT
//       COUNT(*)                                   AS total_trips,
//       COALESCE(SUM(fare), 0)                     AS total_earnings,
//       COALESCE(SUM(passenger_count), 0)          AS total_passengers,
//       COUNT(*) FILTER (WHERE status='completed') AS completed_trips,
//       COUNT(*) FILTER (WHERE status='cancelled') AS cancelled_trips,
//       ROUND(AVG(fare)::numeric, 2)               AS avg_fare,
//       TO_CHAR(
//         MODE() WITHIN GROUP (ORDER BY TO_CHAR(date, 'Day')),
//         'Day'
//       )                                          AS busiest_day,
//       ROUND(
//         AVG(EXTRACT(EPOCH FROM (ended_at - started_at))/60)::numeric, 0
//       )                                          AS avg_duration_mins
//     FROM trips
//     WHERE driver_id = $driverId AND status = 'completed'
//
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api/axios';
import type { DriverTrip, TripStats, FilterTab } from './types';

const PAGE_SIZE = 25;

interface UseDriverTripsReturn {
  trips:        DriverTrip[];
  stats:        TripStats | null;
  loading:      boolean;
  loadingMore:  boolean;
  statsLoading: boolean;
  hasMore:      boolean;
  activeFilter: FilterTab;
  searchQuery:  string;
  setFilter:    (tab: FilterTab) => void;
  setSearch:    (q: string) => void;
  loadMore:     () => Promise<void>;
  refresh:      () => Promise<void>;
}

export const useDriverTrips = (): UseDriverTripsReturn => {
  const [trips,        setTrips]        = useState<DriverTrip[]>([]);
  const [stats,        setStats]        = useState<TripStats | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [hasMore,      setHasMore]      = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [page,         setPage]         = useState(1);

  // Debounce search so we don't fire on every keystroke
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSetSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(q), 350);
  }, []);

  // ── Fetch stats (once, independent of filters) ───────────────────────────
  useEffect(() => {
    const load = async () => {
      setStatsLoading(true);
      try {
        const res = await api.get('/driver/trips/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Driver trip stats fetch failed:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    load();
  }, []);

  // ── Fetch trips (resets when filter or search changes) ───────────────────
  const fetchTrips = useCallback(async (resetPage = true) => {
    if (resetPage) {
      setLoading(true);
      setPage(1);
    }

    const currentPage = resetPage ? 1 : page;

    try {
      const params = new URLSearchParams({
        status: activeFilter,
        page:   String(currentPage),
        limit:  String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await api.get(`/driver/trips?${params.toString()}`);
      const { trips: fetched, pages } = res.data;

      if (resetPage) {
        setTrips(fetched || []);
      } else {
        setTrips(prev => [...prev, ...(fetched || [])]);
      }
      setHasMore(currentPage < (pages ?? 1));
    } catch (err) {
      console.error('Driver trips fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, debouncedSearch, page]);

  // Reset and refetch when filter or search changes
  useEffect(() => { fetchTrips(true); }, [activeFilter, debouncedSearch]);

  // ── Load more (pagination) ────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);

    try {
      const params = new URLSearchParams({
        status: activeFilter,
        page:   String(nextPage),
        limit:  String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await api.get(`/driver/trips?${params.toString()}`);
      const { trips: fetched, pages } = res.data;
      setTrips(prev => [...prev, ...(fetched || [])]);
      setHasMore(nextPage < (pages ?? 1));
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, activeFilter, debouncedSearch]);

  const setFilter = useCallback((tab: FilterTab) => {
    setActiveFilter(tab);
  }, []);

  return {
    trips, stats,
    loading, loadingMore, statsLoading, hasMore,
    activeFilter, searchQuery,
    setFilter,
    setSearch: handleSetSearch,
    loadMore,
    refresh: () => fetchTrips(true),
  };
};