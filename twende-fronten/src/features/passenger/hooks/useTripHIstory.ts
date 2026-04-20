// src/features/passenger/hooks/useTripHistory.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api/axios'; // use your existing Axios instance (has JWT header)

export interface Trip {
  id: string;
  routeName?: string;
  from: string;
  to: string;
  date: string;
  time: string;
  fare: number;
  // 'ongoing' matches DB — frontend treats it the same as pending
  status: 'completed' | 'cancelled' | 'ongoing';
  duration?: string;
  matatuNumber?: string;
  driverId?: number;
  driverName?: string;
  driverRating?: number;
  wasRated?: boolean;
  created_at?: string;
}

interface UseTripHistoryReturn {
  trips: Trip[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markPaid: (tripId: string) => Promise<void>;
  submitRating: (
    tripId: string,
    driverId: number,
    scores: {
      punctuality_score: number;
      comfort_score: number;
      safety_score: number;
      overall_score: number;
      comment: string;
    }
  ) => Promise<void>;
}

export const useTripHistory = (): UseTripHistoryReturn => {
  const { token } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.get('/trips/history');
      const data = res.data;

      const tripData: Trip[] = Array.isArray(data)
        ? data
        : data.trips || data.history || [];

      // Newest first
      const sorted = [...tripData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTrips(sorted);
    } catch (err: any) {
      console.error('useTripHistory fetch error:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to load trip history'
      );
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const refresh = useCallback(async () => {
    await fetchTrips();
  }, [fetchTrips]);

  // Mark an ongoing trip as paid/completed
  const markPaid = useCallback(
    async (tripId: string) => {
      await api.post(`/trips/${tripId}/pay`);

      // Optimistic update
      setTrips(prev =>
        prev.map(t =>
          t.id === tripId ? { ...t, status: 'completed' as const } : t
        )
      );
    },
    []
  );

  // Submit a driver rating
  const submitRating = useCallback(
    async (
      tripId: string,
      driverId: number,
      scores: {
        punctuality_score: number;
        comfort_score: number;
        safety_score: number;
        overall_score: number;
        comment: string;
      }
    ) => {
      await api.post('/ratings', {
        driver_id: driverId,
        trip_id: tripId,
        ...scores,
      });

      // Optimistic update — hide Rate button immediately
      setTrips(prev =>
        prev.map(t =>
          t.id === tripId ? { ...t, wasRated: true } : t
        )
      );
    },
    []
  );

  return { trips, loading, error, refresh, markPaid, submitRating };
};