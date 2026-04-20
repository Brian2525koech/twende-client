// src/features/admin/pages/PassengersPage/useAdminPassengers.ts
//
// Backend endpoints this hook requires:
//
// GET  /api/admin/passengers          → { passengers: PassengerRow[], stats: PassengerStats }
// GET  /api/admin/passengers/waiting  → { waiting: WaitingPassenger[] }
// GET  /api/admin/passengers/trips    → { trips: TripRow[] }
//       query params: ?status=&route_id=&date=

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api/axios';
import type {
  PassengerRow,
  WaitingPassenger,
  TripRow,
  PassengerStats,
} from './types';

const POLL_MS = 8000; // refresh waiting list every 8s

export type TripStatusFilter = 'all' | 'completed' | 'ongoing' | 'cancelled';
export type PaymentFilter    = 'all' | 'paid' | 'cash_pending' | 'unpaid';

interface UseAdminPassengersReturn {
  stats:           PassengerStats | null;
  passengers:      PassengerRow[];
  waiting:         WaitingPassenger[];
  trips:           TripRow[];
  loading:         boolean;
  waitingLoading:  boolean;
  tripsLoading:    boolean;
  search:          string;
  setSearch:       (v: string) => void;
  tripStatus:      TripStatusFilter;
  setTripStatus:   (v: TripStatusFilter) => void;
  paymentFilter:   PaymentFilter;
  setPaymentFilter:(v: PaymentFilter) => void;
  dateFilter:      string;
  setDateFilter:   (v: string) => void;
  refresh:         () => void;
}

export const useAdminPassengers = (): UseAdminPassengersReturn => {
  const [stats,      setStats]      = useState<PassengerStats | null>(null);
  const [passengers, setPassengers] = useState<PassengerRow[]>([]);
  const [waiting,    setWaiting]    = useState<WaitingPassenger[]>([]);
  const [trips,      setTrips]      = useState<TripRow[]>([]);

  const [loading,        setLoading]        = useState(true);
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [tripsLoading,   setTripsLoading]   = useState(false);

  const [search,        setSearch]        = useState('');
  const [tripStatus,    setTripStatus]    = useState<TripStatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [dateFilter,    setDateFilter]    = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch waiting passengers (also used by poller) ─────────────────────
  const fetchWaiting = useCallback(async () => {
    setWaitingLoading(true);
    try {
      const res = await api.get('/admin/passengers/waiting');
      setWaiting(res.data.waiting ?? []);
    } catch {
      // non-fatal
    } finally {
      setWaitingLoading(false);
    }
  }, []);

  // ── Fetch trips with filters ───────────────────────────────────────────
  const fetchTrips = useCallback(async (
    status: TripStatusFilter,
    payment: PaymentFilter,
    date: string,
  ) => {
    setTripsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status  !== 'all') params.status         = status;
      if (payment !== 'all') params.payment_status  = payment;
      if (date)              params.date            = date;

      const res = await api.get('/admin/passengers/trips', { params });
      setTrips(res.data.trips ?? []);
    } catch {
      toast.error('Failed to load trips');
    } finally {
      setTripsLoading(false);
    }
  }, []);

  // ── Full initial load ──────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [passRes, waitRes, tripRes] = await Promise.allSettled([
        api.get('/admin/passengers'),
        api.get('/admin/passengers/waiting'),
        api.get('/admin/passengers/trips'),
      ]);

      if (passRes.status === 'fulfilled') {
        setPassengers(passRes.value.data.passengers ?? []);
        setStats(passRes.value.data.stats ?? null);
      }
      if (waitRes.status === 'fulfilled') {
        setWaiting(waitRes.value.data.waiting ?? []);
      }
      if (tripRes.status === 'fulfilled') {
        setTrips(tripRes.value.data.trips ?? []);
      }
    } catch (err) {
      console.error('[AdminPassengers] loadAll error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Re-fetch trips whenever filters change ────────────────────────────
  useEffect(() => {
    if (loading) return;
    fetchTrips(tripStatus, paymentFilter, dateFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripStatus, paymentFilter, dateFilter]);

  // ── Mount + poller ─────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();

    pollRef.current = setInterval(fetchWaiting, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadAll, fetchWaiting]);

  return {
    stats,
    passengers,
    waiting,
    trips,
    loading,
    waitingLoading,
    tripsLoading,
    search,
    setSearch,
    tripStatus,
    setTripStatus,
    paymentFilter,
    setPaymentFilter,
    dateFilter,
    setDateFilter,
    refresh: loadAll,
  };
};