// src/utils/haversine.ts
import { query } from '../config/db'

export const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const calculateETA = (matatuLat: number, matatuLng: number, stopLat: number, stopLng: number, averageSpeedKph: number = 30): number => {
  const distanceKm = haversineDistance(matatuLat, matatuLng, stopLat, stopLng)
  const timeHours = distanceKm / averageSpeedKph
  const timeMinutes = Math.round(timeHours * 60)
  return timeMinutes < 1 ? 1 : timeMinutes
}

/**
 * NEW: Finds the closest coordinate on the OSRM road path for a given stop.
 * This keeps stops perfectly aligned with the highway.
 */
export const findNearestPathPoint = (
  stop: { lat: number; lng: number },
  path: { lat: number; lng: number }[]
): { lat: number; lng: number } => {
  let closest = path[0];
  let minDistance = Infinity;

  for (const point of path) {
    // Simple Euclidean distance is fine for snapping small offsets
    const dist = Math.sqrt(
      Math.pow(point.lat - stop.lat, 2) + Math.pow(point.lng - stop.lng, 2)
    );
    if (dist < minDistance) {
      minDistance = dist;
      closest = point;
    }
  }
  return closest;
};

export const findNearestRoute = async (lat: number, lng: number): Promise<number | null> => {
  const result = await query(
    `SELECT route_id, 
    (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat)))) AS distance
    FROM stops
    ORDER BY distance ASC
    LIMIT 1`,
    [lat, lng]
  )

  if (result.rows.length > 0 && result.rows[0].distance < 2) { 
    return result.rows[0].route_id
  }
  return null
}