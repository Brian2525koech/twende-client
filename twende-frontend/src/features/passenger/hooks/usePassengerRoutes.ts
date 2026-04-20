import { useState, useEffect, useCallback } from 'react';
import { fetchAllRoutes } from '@/lib/api/routesApi';
import api from '@/lib/api/axios';
import type { Route } from '@/types';

interface UsePassengerRoutesReturn {
  routes: Route[];
  favouriteIds: Set<number>;
  loading: boolean;
  error: string | null;
  toggleFavourite: (routeId: number, isFav: boolean) => void;
}

export const usePassengerRoutes = (): UsePassengerRoutesReturn => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch both routes and favourites
      const [routeData, favResponse] = await Promise.all([
        fetchAllRoutes(),
        api.get('/favourites').catch(() => ({ data: [] })) // Fallback if API fails
      ]);

      // 2. Safely set routes
      setRoutes(Array.isArray(routeData) ? routeData : []);

      // 3. Defensive Check for Favourites
      // Some backends wrap data in a 'data' property: { data: [...] }
      const rawFavs = favResponse.data?.data || favResponse.data || [];
      
      if (Array.isArray(rawFavs)) {
        const ids = new Set<number>(
          rawFavs.map((f: any) => typeof f === 'object' ? f.route_id : f)
        );
        setFavouriteIds(ids);
      } else {
        setFavouriteIds(new Set());
      }

    } catch (err: any) {
      console.error('Detailed Load Error:', err);
      setError('Could not sync with database. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleFavourite = useCallback((routeId: number, isFav: boolean) => {
    setFavouriteIds(prev => {
      const next = new Set(prev);
      if (isFav) next.add(routeId);
      else next.delete(routeId);
      return next;
    });
  }, []);

  return { routes, favouriteIds, loading, error, toggleFavourite };
};