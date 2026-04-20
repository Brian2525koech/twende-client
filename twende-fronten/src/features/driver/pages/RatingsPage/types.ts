// src/features/driver/pages/RatingsPage/types.ts

export type FilterTab = 'all' | '5' | '4' | 'low';

export interface RatingEntry {
  id: number;
  passenger_name: string;
  punctuality_score: number;
  comfort_score: number;
  safety_score: number;
  overall_score: number;
  comment: string | null;
  created_at: string;
}

export interface RatingsPageData {
  average_punctuality: number;
  average_comfort: number;
  average_safety: number;
  average_overall: number;
  total_ratings: number;
  total_trips: number;
  ratings: RatingEntry[];
}

export function pillClass(score: number): string {
  if (score >= 4) return 'dr-pill-good';
  if (score >= 3) return 'dr-pill-ok';
  return 'dr-pill-low';
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function filterRatings(ratings: RatingEntry[], tab: FilterTab): RatingEntry[] {
  if (tab === 'all') return ratings;
  if (tab === '5') return ratings.filter(r => r.overall_score === 5);
  if (tab === '4') return ratings.filter(r => r.overall_score === 4);
  return ratings.filter(r => r.overall_score <= 3);
}