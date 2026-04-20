// src/features/driver/pages/ProfilePage/types.ts

export interface DriverProfileData {
  // User fields
  user_id:          number;
  driver_name:      string;
  email:            string;
  profile_image_url: string | null;
  created_at:       string;
  city_name:        string | null;

  // Profile fields
  profile_id:       number;
  plate_number:     string;
  is_active:        boolean;
  capacity:         number;
  average_rating:   number;
  total_ratings:    number;
  total_trips:      number;

  // Vehicle details
  vehicle_make:    string | null;
  vehicle_model:   string | null;
  vehicle_year:    number | null;
  vehicle_colour:  string | null;
  amenities:       string[];

  // Route
  route_id:    number | null;
  route_name:  string | null;
  route_colour: string | null;
}

export interface MatatuImage {
  id:          number;
  image_url:   string;
  caption:     string | null;
  order_index: number;
}

export interface DriverReview {
  id:                 number;
  passenger_name:     string;
  overall_score:      number;
  punctuality_score:  number;
  comfort_score:      number;
  safety_score:       number;
  comment:            string | null;
  created_at:         string;
}

export interface RatingBreakdown {
  distribution: Record<number, number>; // { 5: N, 4: N, ... }
  avg_punctuality: number;
  avg_comfort:     number;
  avg_safety:      number;
  avg_overall:     number;
}

export interface DriverProfilePageData {
  profile:   DriverProfileData;
  images:    MatatuImage[];
  reviews:   DriverReview[];
  breakdown: RatingBreakdown;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export const timeAgo = (dateStr: string): string => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};

export type ModalType =
  | 'photo'
  | 'name'
  | 'password'
  | 'vehicle'
  | 'amenities'
  | null;