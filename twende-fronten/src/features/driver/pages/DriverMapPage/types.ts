// src/features/driver/pages/DriverMapPage/types.ts

export interface DriverPosition {
  lat:       number
  lng:       number
  speed:     number
  direction?: 'forward' | 'backward'
  timestamp: string
}

export interface WaitingPassenger {
  id:                    number
  passenger_name:        string
  stop_name:             string
  stop_id:               number
  stop_lat:              string
  stop_lng:              string
  order_index:           number
  destination_name:      string | null
  status:                'waiting' | 'accepted'
  created_at:            string
  expires_at:            string
  accepted_by_driver_id: number | null
}

export interface RouteStop {
  id:          number
  name:        string
  lat:         string
  lng:         string
  order_index: number
  eta_minutes?: number | null
  is_upcoming?: boolean
}

export interface RouteWaypoint {
  lat:  number
  lng:  number
  name: string
}

export interface OnboardPassengerLive {
  passenger_id:    number | null
  passenger_name:  string
  boarded_at_stop: string
  destination:     string
  trip_id:         number | null
  paid_via_mpesa:  boolean
  payment_display: string
  is_virtual:      boolean
  fare:            number
}

export interface WaitingAheadPassenger {
  id:          number
  name:        string
  lat:         number
  lng:         number
  destination: string
  eta_minutes: number
}

export interface MatatuMovedPayload {
  driver_id:          number
  driver_name:        string
  plate_number:       string
  route_id:           number
  average_rating:     number
  lat:                number
  lng:                number
  speed:              number
  direction:          'forward' | 'backward'
  waypoint_index:     number
  total_waypoints:    number
  progress_percent:   number
  passengers:         number
  capacity:           number
  is_waiting:         boolean
  stops_eta:          RouteStop[]
  current_passengers: OnboardPassengerLive[]
  waiting_ahead:      WaitingAheadPassenger[]
  timestamp:          string
  simulated:          boolean
}

export interface StopWaitGroup {
  stop_id:     number
  stop_name:   string
  lat:         number
  lng:         number
  order_index: number
  passengers:  WaitingPassenger[]
}