// src/features/admin/pages/SimulationPage/types.ts

export interface OnboardPassenger {
  passengerId:         number;
  passengerName:       string;
  boardedAtStop:       string;
  destinationStopName: string | null;
  destinationPathIdx:  number;
  tripId:              number;
  paidViaMpesa:        boolean;
  payment_display:     string;
}

export interface SimStatus {
  driverId:         number;
  routeId:          number;
  plateNumber:      string;
  driverName:       string;
  currentIndex:     number;
  totalWaypoints:   number;
  progressPercent:  number;
  currentPosition:  { lat: number; lng: number } | null;
  speedMultiplier:  number;
  isRunning:        boolean;
  passengerCount:   number;
  onboardCount:     number;
}

export interface RouteWaypoint {
  lat:  number;
  lng:  number;
  name?: string;
}

export interface RouteStop {
  id:          number;
  name:        string;
  lat:         number;
  lng:         number;
  order_index: number;
}

export interface DriverRow {
  // From /api/admin/drivers
  user_id:        number;
  driver_name:    string;
  email:          string;
  plate_number:   string;
  route_id:       number | null;
  route_name:     string | null;
  route_colour:   string | null;
  city_name:      string | null;
  is_active:      boolean;
  average_rating: number;
  last_lat:       number | null;
  last_lng:       number | null;
  // Merged from sim status
  sim:            SimStatus | null;
  // Fetched on demand
  onboard:        OnboardPassenger[];
  waypoints:      RouteWaypoint[];
  stops:          RouteStop[];
  mapExpanded:    boolean;
}

export const SPEED_OPTIONS = [
  { value: 10, label: '10×', desc: '~5 min lap' },
  { value: 15, label: '15×', desc: '~3.3 min' },
  { value: 20, label: '20×', desc: '~2.5 min' },
  { value: 25, label: '25×', desc: '~2 min' },
  { value: 30, label: '30×', desc: '~1.7 min' },
] as const;

export const timeAgo = (d: string): string => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export const formatProgress = (current: number, total: number): string => {
  if (!total) return '0 / 0';
  return `${current.toLocaleString()} / ${total.toLocaleString()}`;
};