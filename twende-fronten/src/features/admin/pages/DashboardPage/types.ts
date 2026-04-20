// src/features/admin/pages/DashboardPage/types.ts

export interface PlatformStats {
  active_drivers:     number;
  total_drivers:      number;
  passengers_onboard: number;
  trips_today:        number;
  earnings_today:     number;
  waiting_now:        number;
  total_routes:       number;
  running_sims:       number;
}

export interface SimDriver {
  user_id:         number;
  driver_name:     string;
  plate_number:    string;
  route_id:        number | null;
  route_name:      string | null;
  route_colour:    string | null;
  city_name:       string | null;
  is_active:       boolean;
  average_rating:  number;
  last_lat:        number | null;
  last_lng:        number | null;
  // From /admin/sim/status
  simulation_running:   boolean;
  progress_percent:     number;
  current_index:        number;
  total_waypoints:      number;
  speed_multiplier:     number;
  onboard_count:        number;
  onboard_passengers:   OnboardPassenger[];
}

export interface OnboardPassenger {
  passengerId:         number;
  passengerName:       string;
  boardedAtStop:       string;
  destinationStopName: string | null;
  paidViaMpesa:        boolean;
  payment_display:     string;
}

export interface WaitingNow {
  id:             number;
  passenger_name: string;
  stop_name:      string;
  destination_name: string | null;
  route_name:     string;
  created_at:     string;
  status:         string;
}

export interface RecentTrip {
  id:             number;
  passenger_name: string;
  from_stop:      string;
  to_stop:        string;
  route_name:     string;
  fare:           number;
  status:         string;
  payment_status: string;
  created_at:     string;
}

export interface RecentRating {
  id:              number;
  passenger_name:  string;
  driver_name:     string;
  overall_score:   number;
  comment:         string | null;
  created_at:      string;
}

export const timeAgo = (d: string): string => {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};