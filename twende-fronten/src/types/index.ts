// src/types/index.ts

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'passenger' | 'driver' | 'admin';
  profile_image_url?: string;
  city_id?: number;
  created_at: string;
  driver_profile?: DriverProfile; // Nested profile for drivers
}

export interface DriverProfile {
  id: number;
  user_id: number;
  plate_number: string;
  route_id: number;
  is_active: boolean;
  average_rating: string | number;
  total_ratings: number;
  last_lat?: number;
  last_lng?: number;
  route_name?: string;
  route_colour?: string;
}

export interface Route {
  id: number;
  city_id: number;
  name: string;
  colour: string;
  description: string;
  city_name?: string;
  active_drivers?: string | number;
  average_rating?: number | string; 
}

export interface Stop {
  id: number;
  route_id: number;
  name: string;
  lat: string | number;
  lng: string | number;
  order_index: number;
  eta_minutes?: number; // Calculated by backend
}