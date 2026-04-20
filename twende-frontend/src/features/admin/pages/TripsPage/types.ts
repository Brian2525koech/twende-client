// src/features/admin/pages/TripsPage/types.ts

export interface TripRow {
  id:               number;
  passenger_name:   string;
  passenger_id:     number;
  driver_name:      string | null;
  driver_id:        number | null;
  route_name:       string | null;
  route_colour:     string | null;
  from_stop:        string;
  to_stop:          string;
  fare:             number;
  status:           'completed' | 'ongoing' | 'cancelled';
  payment_status:   'paid' | 'cash_pending' | 'unpaid' | 'waived';
  payment_method:   string | null;
  date:             string;
  time:             string;
  duration:         string | null;
  created_at:       string;
}

export interface TripStats {
  trips_today:      number;
  fare_today:       number;
  ongoing_count:    number;
  cash_pending_count: number;
}

export interface RouteOption {
  id:     number;
  name:   string;
  colour: string;
}

export type StatusFilter  = 'all' | 'completed' | 'ongoing' | 'cancelled';
export type PaymentFilter = 'all' | 'paid' | 'cash_pending' | 'unpaid' | 'waived';

export interface DateRange {
  from: string;
  to:   string;
}

/** Trips grouped by display date label */
export interface TripGroup {
  label: string;
  trips: TripRow[];
}