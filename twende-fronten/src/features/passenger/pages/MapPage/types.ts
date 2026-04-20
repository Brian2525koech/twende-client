// src/features/passenger/pages/MapPage/types.ts

export interface StopETA {
  id: number;
  name: string;
  lat: number;
  lng: number;
  order_index: number;
  eta_minutes: number;
  is_upcoming?: boolean;
}

export interface Driver {
  profile_id?: number;
  user_id?: number;
  driver_id?: number;
  plate_number: string;
  driver_name: string;
  average_rating: string | number | null;
  total_ratings?: number | null;
  capacity?: number | null;
  latitude: string | number | null;
  longitude: string | number | null;
  speed?: string | number | null;
  passengers?: number;
  is_waiting?: boolean;
  last_updated?: string | null;
  stops_eta?: StopETA[];
  simulated?: boolean;
}

export interface Stop {
  id: number;
  name: string;
  lat: number | string;
  lng: number | string;
  order_index?: number;
}

// ── Waiting / trip state ──────────────────────────────────────────────────────

export type WaitingStatus = "idle" | "waiting" | "onboard" | "arriving";

export interface WaitingInfo {
  waiting_id: number;
  stop_id: number;
  stop_name: string;
  stop_lat: number;
  stop_lng: number;
  destination_name: string | null;
  expires_at: string;
}

export interface OnboardTrip {
  id: number;
  route_name: string;
  from_stop: string;
  to_stop: string;
  fare: number;
  payment_status: string;
  started_at: string;
  matatu_number: string;
  driver: {
    id: number;
    name: string;
    image: string | null;
    plate_number: string;
    average_rating: number;
    lat: number | null;
    lng: number | null;
    live: boolean;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const toNum = (
  v: string | number | null | undefined,
  fallback = 0,
): number =>
  v === null || v === undefined || v === "" ? fallback : parseFloat(String(v));

export const hasPosition = (d: Driver): boolean =>
  d.latitude !== null &&
  d.longitude !== null &&
  String(d.latitude) !== "" &&
  String(d.longitude) !== "";

export const driverKey = (d: Driver): number =>
  d.user_id ?? d.driver_id ?? d.profile_id ?? 0;

export const etaLabel = (mins: number): string => {
  if (mins <= 0) return "Here now";
  if (mins === 1) return "1 min";
  return `${mins} min`;
};
