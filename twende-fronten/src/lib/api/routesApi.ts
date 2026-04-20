// src/lib/api/routesApi.ts
import api from './axios';
import type { Route } from '@/types';

export const fetchAllRoutes = async () => {
  const response = await api.get('/routes/all');
  return response.data.routes as Route[];
};

// Matches backend: router.get('/routes/:id/geometry', getRouteGeometry)
export const fetchRouteCoordinates = async (routeId: string) => {
  const response = await api.get(`/routes/${routeId}/geometry`);
  // Expects { waypoints: [...] }
  return response.data.waypoints; 
};

// Matches backend: router.get('/routes/:id/live-drivers', getLiveDriversByRoute)
export const fetchLiveDrivers = async (routeId: string) => {
  const response = await api.get(`/routes/${routeId}/live-drivers`);
  // Expects { drivers: [...] }
  return response.data.drivers;
};

// NEW: Matches backend: router.get('/routes/:id/stops', getRouteStops)
export const fetchRouteStops = async (routeId: string) => {
  const response = await api.get(`/routes/${routeId}/stops`);
  // Expects { stops: [...] }
  return response.data.stops;
};