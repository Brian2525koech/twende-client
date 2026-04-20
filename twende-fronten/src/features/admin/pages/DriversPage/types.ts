// src/features/admin/pages/DriversPage/types.ts

export interface DriverRow {
  user_id:          number;
  name:             string;
  email:            string;
  plate_number:     string;
  route_id:         number | null;
  route_name:       string | null;
  route_colour:     string | null;
  city_name:        string | null;
  is_active:        boolean;
  average_rating:   number;
  total_trips:      number;
  capacity:         number;
  vehicle_make:     string | null;
  vehicle_model:    string | null;
  vehicle_year:     number | null;
  vehicle_colour:   string | null;
  amenities:        string[];
  matatu_image_url: string | null;
  simulation_running: boolean;
  last_lat:         number | null;
  last_lng:         number | null;
  created_at:       string;
}

export interface RouteOption {
  id:     number;
  name:   string;
  colour: string;
  city:   string;
}

export interface CityOption {
  id:   number;
  name: string;
}

export interface AddDriverForm {
  name:        string;
  email:       string;
  password:    string;
  plate_number: string;
  route_id:    number | '';
  city_id:     number | '';
  capacity:    number;
}

export type FilterStatus = 'all' | 'online' | 'offline';

export interface OnboardPassenger {
  passenger_id:   number;
  passenger_name: string;
  boarding_stop:  string;
  destination:    string;
  payment_status: string;
}