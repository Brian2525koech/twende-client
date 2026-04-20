// src/types/index.ts
import { Request } from 'express'

export interface User {
  id: number
  name: string
  email: string
  password_hash: string
  role: 'passenger' | 'driver' | 'admin'
  profile_image_url?: string // Added
  city_id?: number // Made optional
  created_at: Date
}

export interface DriverProfile {
  id: number
  user_id: number
  plate_number: string
  route_id: number
  is_active: boolean
  average_rating: number
  total_ratings: number
  last_lat?: number // Added for live caching
  last_lng?: number // Added for live caching
  updated_at?: Date // Added
}

// ... rest of your interfaces (City, Route, Stop, etc. remain the same)

export interface AuthRequest extends Request {
  user?: {
    id: number
    role: string
    email: string
  }
}