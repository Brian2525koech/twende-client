// src/features/driver/pages/TripsPage/types.ts

export type TripStatus = 'completed' | 'cancelled' | 'ongoing';
export type PaymentStatus = 'paid' | 'cash_pending' | 'unpaid' | 'waived';
export type FilterTab = 'all' | 'completed' | 'cancelled' | 'ongoing';

export interface DriverTrip {
  id:              number;
  passenger_id:    number;
  passenger_name:  string;

  from_stop:       string;
  to_stop:         string;
  route_name:      string;
  route_colour:    string | null;

  date:            string;   // YYYY-MM-DD
  time:            string;   // e.g. "02:15 PM"
  fare:            number;
  status:          TripStatus;
  payment_status:  PaymentStatus;
  payment_method:  string | null;

  passenger_count: number;
  duration:        string | null;
  matatu_number:   string | null;

  started_at:  string | null;
  ended_at:    string | null;
  created_at:  string;
}

export interface TripStats {
  total_trips:        number;
  total_earnings:     number;
  total_passengers:   number;
  completed_trips:    number;
  cancelled_trips:    number;
  avg_fare:           number;
  busiest_day:        string | null;   // day name e.g. "Monday"
  avg_duration_mins:  number | null;
}

// ── Date grouping ─────────────────────────────────────────────────────────────
export const groupTripsByDate = (
  trips: DriverTrip[]
): Record<string, DriverTrip[]> => {
  const groups: Record<string, DriverTrip[]> = {};
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  for (const trip of trips) {
    const d = new Date(trip.date); d.setHours(0,0,0,0);
    let label: string;
    if (d.getTime() === today.getTime())          label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = d.toLocaleDateString('en-KE', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    if (!groups[label]) groups[label] = [];
    groups[label].push(trip);
  }
  return groups;
};

// ── Payment label + colour ────────────────────────────────────────────────────
export const paymentInfo = (
  status: PaymentStatus
): { label: string; cls: string } => {
  switch (status) {
    case 'paid':          return { label: '✓ Paid',        cls: 'tp-pay-paid' };
    case 'cash_pending':  return { label: '⏳ Cash Pending', cls: 'tp-pay-cash' };
    case 'unpaid':        return { label: '⚠ Unpaid',       cls: 'tp-pay-unpaid' };
    case 'waived':        return { label: 'Waived',         cls: 'tp-pay-waived' };
  }
};

// ── Relative time ─────────────────────────────────────────────────────────────
export const timeAgo = (dateStr: string): string => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};