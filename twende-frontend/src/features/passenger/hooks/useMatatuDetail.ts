// src/features/passenger/hooks/useMatatuDetail.ts

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/authFetch';   // ← Import this

export interface MatatuImage {
  id: number;
  image_url: string;
  caption: string | null;
  order_index: number;
}

export interface MatatuStop {
  id: number;
  name: string;
  lat: string;
  lng: string;
  order_index: number;
}

export interface MatatuReview {
  id: number;
  punctuality_score: number;
  comfort_score: number;
  safety_score: number;
  overall_score: number;
  comment: string | null;
  created_at: string;
  passenger_name: string | null;
}

export interface RatingBreakdown {
  distribution: Record<number, number>;
  averages: {
    punctuality: number;
    comfort: number;
    safety: number;
    overall: number;
  };
}

export interface MatatuDetail {
  profile_id: number;
  user_id: number;
  plate_number: string;
  route_id: number;
  capacity: number;
  is_active: boolean;
  average_rating: number;
  total_ratings: number;
  matatu_image_url: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_colour: string | null;
  amenities: string[];
  total_trips: number;
  last_lat: string | null;
  last_lng: string | null;
  driver_name: string;
  driver_image_url: string | null;
  driver_since: string;
  route_name: string;
  route_colour: string;
  route_description: string | null;
  city_name: string;
}

interface UseMatatuDetailReturn {
  matatu: MatatuDetail | null;
  images: MatatuImage[];
  stops: MatatuStop[];
  reviews: MatatuReview[];
  ratingBreakdown: RatingBreakdown | null;
  loading: boolean;
  error: string | null;
}

export const useMatatuDetail = (id: string | undefined): UseMatatuDetailReturn => {
  const [matatu, setMatatu] = useState<MatatuDetail | null>(null);
  const [images, setImages] = useState<MatatuImage[]>([]);
  const [stops, setStops] = useState<MatatuStop[]>([]);
  const [reviews, setReviews] = useState<MatatuReview[]>([]);
  const [ratingBreakdown, setRatingBreakdown] = useState<RatingBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use authFetch instead of raw fetch
        const res = await authFetch(`/matatu/${id}`);

        if (!res.ok) {
          throw new Error(
            res.status === 404 ? 'Matatu not found' : 'Failed to load matatu details'
          );
        }

        const data = await res.json();

        setMatatu(data.matatu);
        setImages(data.images ?? []);
        setStops(data.stops ?? []);
        setReviews(data.reviews ?? []);
        setRatingBreakdown(data.rating_breakdown ?? null);
      } catch (err: any) {
        // authFetch already handles 401 with toast + redirect
        // So we only set error for other cases (network, 404, 500, etc.)
        if (err.message !== 'Token expired') {
          setError(err.message ?? 'Something went wrong');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  return { matatu, images, stops, reviews, ratingBreakdown, loading, error };
};