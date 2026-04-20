// src/features/admin/pages/RoutesPage/types.ts

export interface City {
  id: number;
  name: string;
  country: string;
}

export interface RouteStop {
  id: number;
  route_id: number;
  name: string;
  lat: number;
  lng: number;
  order_index: number;
}

export interface AdminRoute {
  id: number;
  city_id: number;
  city_name: string;
  name: string;
  colour: string;
  description: string | null;
  stop_count: number;
  active_driver_count: number;
  stops?: RouteStop[];
}

export interface RouteFormData {
  name: string;
  colour: string;
  city_id: number | '';
  description: string;
}

export interface StopFormData {
  name: string;
  lat: string;
  lng: string;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}