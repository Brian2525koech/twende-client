// src/features/driver/pages/DashboardPage/types.ts

export interface DriverProfile {
  profile_id:      number;
  user_id:         number;
  plate_number:    string;
  is_active:       boolean;
  capacity:        number;
  average_rating:  number;
  total_ratings:   number;
  vehicle_make:    string | null;
  vehicle_model:   string | null;
  vehicle_year:    number | null;
  vehicle_colour:  string | null;
  route_id:        number | null;
  driver_name:     string;
  profile_image_url: string | null;
  route_name:      string | null;
  route_colour:    string | null;
  city_name:       string | null;
}

export interface DashboardStats {
  trips_today:      number;
  earnings_today:   number;
  passengers_today: number;
  completed_today:  number;
  cancelled_today:  number;
}

export interface WaitingPassenger {
  id:                      number;
  status:                  'waiting' | 'accepted';
  passenger_name:          string;
  stop_name:               string;
  lat:                     number;
  lng:                     number;
  order_index:             number;
  destination_name:        string | null;
  created_at:              string;
  expires_at:              string;
  accepted_by_driver_id:   number | null;
}

export interface RecentTrip {
  id:              number;
  from_stop:       string;
  to_stop:         string;
  route_name:      string;
  date:            string;
  time:            string;
  fare:            number;
  status:          'completed' | 'cancelled' | 'ongoing';
  payment_status:  string;
  passenger_count: number;
  passenger_name:  string;
}

export interface RecentRating {
  overall_score:  number;
  comment:        string | null;
  created_at:     string;
  passenger_name: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const timeAgo = (dateStr: string): string => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

export const waitingDuration = (createdAt: string): string => {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m waiting`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m waiting`;
};