// src/features/admin/pages/PassengersPage/types.ts

export interface PassengerRow {
  id: number;
  name: string;
  email: string;
  city_name: string;
  created_at: string;
  total_trips: number;
  total_ratings: number;
  profile_image_url: string | null;
}

export interface WaitingPassenger {
  id: number;
  passenger_id: number;
  passenger_name: string;
  route_name: string;
  route_colour: string;
  stop_name: string;
  destination_stop_name: string | null;
  status: 'waiting' | 'accepted' | 'boarded' | 'cancelled' | 'expired';
  created_at: string;
  accepted_at: string | null;
  boarded_at: string | null;
  expires_at: string;
  accepted_by_driver_name: string | null;
}

export interface TripRow {
  id: number;
  passenger_name: string;
  driver_name: string | null;
  route_name: string;
  from_stop: string;
  to_stop: string;
  fare: number;
  status: 'completed' | 'ongoing' | 'cancelled';
  payment_status: 'paid' | 'cash_pending' | 'unpaid' | 'waived';
  payment_method: string | null;
  date: string;
  time: string;
  created_at: string;
}

export interface PassengerStats {
  total_passengers: number;
  active_today: number;
  waiting_now: number;
  trips_today: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function waitingDuration(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '<1m';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}