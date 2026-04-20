// src/features/driver/pages/RatingsPage/useDriverRatings.ts
import { useState, useEffect } from 'react';
import api from '@/lib/api/axios';
import type { RatingsPageData } from './types';

export function useDriverRatings() {
  const [data, setData] = useState<RatingsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/driver/ratings')
      .then(res => setData(res.data as RatingsPageData))
      .catch((err: any) => {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to load ratings';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}