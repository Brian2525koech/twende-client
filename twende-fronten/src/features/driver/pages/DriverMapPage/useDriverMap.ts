// src/features/driver/pages/DriverMapPage/useDriverMap.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/contexts/AuthContext'
import type {
  DriverPosition,
  WaitingPassenger,
  RouteStop,
  RouteWaypoint,
  MatatuMovedPayload,
  StopWaitGroup,
} from './types'

const API        = import.meta.env.VITE_API_URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL

export const useDriverMap = () => {
  const { user, token } = useAuth()

  const [routeId,      setRouteId]      = useState<number | null>(null)
  const [routeName,    setRouteName]    = useState('')
  const [routeColour,  setRouteColour]  = useState('#1D9E75')
  const [waypoints,    setWaypoints]    = useState<RouteWaypoint[]>([])
  const [stops,        setStops]        = useState<RouteStop[]>([])
  const [driverPosition, setDriverPosition] = useState<DriverPosition | null>(null)
  const [waitingPassengers, setWaitingPassengers] = useState<WaitingPassenger[]>([])
  const [stopsETA,     setStopsETA]    = useState<RouteStop[]>([])
  const [waitingAhead, setWaitingAhead] = useState<MatatuMovedPayload['waiting_ahead']>([])
  const [isOnline,     setIsOnline]    = useState(false)
  const [simRunning,   setSimRunning]  = useState(false)
  const [simStarting,  setSimStarting] = useState(false)
  const [loadingRoute, setLoadingRoute] = useState(true)
  const [error,        setError]       = useState<string | null>(null)
  const [currentPayload, setCurrentPayload] = useState<MatatuMovedPayload | null>(null)

  const socketRef = useRef<Socket | null>(null)

  // Group waiting passengers by stop for map pins
  const waitingByStop: StopWaitGroup[] = stops
    .map(stop => ({
      stop_id:     stop.id,
      stop_name:   stop.name,
      lat:         parseFloat(stop.lat as any),
      lng:         parseFloat(stop.lng as any),
      order_index: stop.order_index,
      passengers:  waitingPassengers.filter(w => w.stop_id === stop.id),
    }))
    .filter(g => g.passengers.length > 0)

  // ── Load driver profile + route geometry ────────────────────────────────────
  useEffect(() => {
    if (!token || !user?.id) return

    const load = async () => {
      setLoadingRoute(true)
      try {
        // 1. Driver profile from dashboard
        const profileRes = await fetch(`${API}/driver/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!profileRes.ok) throw new Error('Failed to load driver profile')
        const { profile } = await profileRes.json()

        const rId = profile.route_id
        setRouteId(rId)
        setRouteName(profile.route_name   ?? '')
        setRouteColour(profile.route_colour ?? '#1D9E75')
        setIsOnline(profile.is_active)

        // 2. Check if sim is already running for this driver
        const simRes = await fetch(`${API}/sim/driver/${user.id}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (simRes.ok) {
          const simData = await simRes.json()
          setSimRunning(simData.simulation_active ?? false)
        }

        if (!rId) return

        // 3. Route geometry + stops + waiting in parallel
        const [geoRes, stopsRes, waitingRes] = await Promise.all([
          fetch(`${API}/routes/${rId}/geometry`),
          fetch(`${API}/routes/${rId}/stops`),
          fetch(`${API}/waiting/route/${rId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (geoRes.ok)     setWaypoints((await geoRes.json()).waypoints ?? [])
        if (stopsRes.ok)   setStops((await stopsRes.json()).stops ?? [])
        if (waitingRes.ok) setWaitingPassengers(
          (await waitingRes.json()).waiting_passengers ?? []
        )
      } catch (e: any) {
        setError(e.message ?? 'Failed to load map')
      } finally {
        setLoadingRoute(false)
      }
    }

    load()
  }, [token, user?.id])

  // ── Socket connection ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!routeId || !user?.id) return

    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join:route', routeId)
      socket.emit('join:driver', user.id)
    })

    // Live position from simulator
    socket.on('matatu:moved', (payload: MatatuMovedPayload) => {
      if (payload.driver_id !== user.id) return
      setDriverPosition({
        lat:       payload.lat,
        lng:       payload.lng,
        speed:     payload.speed,
        direction: payload.direction,
        timestamp: payload.timestamp,
      })
      setStopsETA(payload.stops_eta ?? [])
      setWaitingAhead(payload.waiting_ahead ?? [])
      setCurrentPayload(payload)
    })

    // Sim reversed at terminus
    socket.on('matatu:direction_changed', (data: any) => {
      if (data.driver_id !== user.id) return
      setDriverPosition(prev =>
        prev ? { ...prev, direction: data.direction } : prev
      )
    })

    // New virtual passenger spawned ahead (from simulator)
    socket.on(`driver:${user.id}:passenger_waiting`, () => {
      // waiting_ahead is already updated via matatu:moved payload
    })

    // Real passenger boarded
    socket.on(`driver:${user.id}:passenger_boarded`, () => {
      // handled via matatu:moved current_passengers
    })

    // Route-level waiting passenger events
    socket.on(`route:${routeId}:passenger_waiting`, (passenger: WaitingPassenger) => {
      setWaitingPassengers(prev =>
        prev.find(p => p.id === passenger.id) ? prev : [...prev, passenger]
      )
    })

    socket.on(`route:${routeId}:passenger_cancelled`, ({ waiting_id }: { waiting_id: number }) => {
      setWaitingPassengers(prev => prev.filter(p => p.id !== waiting_id))
    })

    socket.on(`route:${routeId}:passenger_accepted`, ({ waiting_id }: { waiting_id: number }) => {
      setWaitingPassengers(prev =>
        prev.map(p => p.id === waiting_id ? { ...p, status: 'accepted' as const } : p)
      )
    })

    socket.on(`route:${routeId}:passenger_boarded`, ({ waiting_id }: { waiting_id: number }) => {
      setWaitingPassengers(prev => prev.filter(p => p.id !== waiting_id))
    })

    return () => {
      socket.emit('leave:route', routeId)
      socket.emit('leave:driver', user.id)
      socket.disconnect()
    }
  }, [routeId, user?.id])

  // ── Go live — starts the simulation for this driver ─────────────────────────
  const goLive = useCallback(async () => {
    if (!token || !user?.id) return
    setSimStarting(true)
    try {
      const res = await fetch(`${API}/admin/sim/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driver_id: user.id, speed_multiplier: 20 }),
      })
      if (!res.ok) throw new Error('Failed to start simulation')

      // Also mark driver as active in DB
      await fetch(`${API}/driver/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: true }),
      })

      setIsOnline(true)
      setSimRunning(true)
    } catch (e) {
      console.error('goLive error:', e)
    } finally {
      setSimStarting(false)
    }
  }, [token, user?.id])

  // ── Go offline — stops the simulation ───────────────────────────────────────
  const goOffline = useCallback(async () => {
    if (!token || !user?.id) return
    try {
      await fetch(`${API}/admin/sim/stop`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driver_id: user.id }),
      })
      await fetch(`${API}/driver/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      })
      setIsOnline(false)
      setSimRunning(false)
      setDriverPosition(null)
    } catch (e) {
      console.error('goOffline error:', e)
    }
  }, [token, user?.id])

  const toggleOnlineStatus = useCallback(async () => {
    if (simRunning || isOnline) await goOffline()
    else await goLive()
  }, [simRunning, isOnline, goLive, goOffline])

  // ── Accept a waiting passenger ──────────────────────────────────────────────
  const acceptPassenger = useCallback(async (waitingId: number) => {
    if (!token) return false
    try {
      const res = await fetch(`${API}/waiting/${waitingId}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to accept')
      setWaitingPassengers(prev =>
        prev.map(p =>
          p.id === waitingId
            ? { ...p, status: 'accepted' as const, accepted_by_driver_id: user?.id ?? null }
            : p
        )
      )
      return true
    } catch {
      return false
    }
  }, [token, user?.id])

  // ── Mark passenger as boarded ───────────────────────────────────────────────
  const markBoarded = useCallback(async (waitingId: number) => {
    if (!token) return false
    try {
      const res = await fetch(`${API}/waiting/${waitingId}/board`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to mark boarded')
      setWaitingPassengers(prev => prev.filter(p => p.id !== waitingId))
      return true
    } catch {
      return false
    }
  }, [token])

  // Next upcoming stop (is_upcoming = true, lowest ETA)
  const nextStop = stopsETA.length > 0
    ? stopsETA
        .filter(s => s.is_upcoming && s.eta_minutes != null)
        .sort((a, b) => (a.eta_minutes ?? 999) - (b.eta_minutes ?? 999))[0] ?? null
    : null

  return {
    routeId,
    routeName,
    routeColour,
    waypoints,
    stops,
    driverPosition,
    waitingPassengers,
    waitingByStop,
    waitingAhead,
    stopsETA,
    nextStop,
    currentPayload,
    isOnline,
    simRunning,
    simStarting,
    loadingRoute,
    error,
    acceptPassenger,
    markBoarded,
    toggleOnlineStatus,
  }
}