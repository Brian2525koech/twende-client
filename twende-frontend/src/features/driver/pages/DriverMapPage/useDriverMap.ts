// src/features/driver/pages/DriverMapPage/useDriverMap.ts
//
// FIXES APPLIED:
//  1. On load, we now call /sim/driver/:id/status to get the REAL simRunning
//     state from the server, and if the sim is NOT running we immediately PATCH
//     is_active=false so the DB matches reality. This prevents the forever-
//     loading overlay that appeared when is_active=true in DB but no sim ran.
//  2. goLive / goOffline now always sync both simRunning AND isOnline together
//     so they never diverge.
//  3. toggleOnlineStatus now uses simRunning as the single source of truth
//     (not `simRunning || isOnline`) to decide current state.

import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
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

  const [routeId,        setRouteId]        = useState<number | null>(null)
  const [routeName,      setRouteName]      = useState('')
  const [routeColour,    setRouteColour]    = useState('#1D9E75')
  const [waypoints,      setWaypoints]      = useState<RouteWaypoint[]>([])
  const [stops,          setStops]          = useState<RouteStop[]>([])
  const [driverPosition, setDriverPosition] = useState<DriverPosition | null>(null)
  const [waitingPassengers, setWaitingPassengers] = useState<WaitingPassenger[]>([])
  const [stopsETA,       setStopsETA]       = useState<RouteStop[]>([])
  const [waitingAhead,   setWaitingAhead]   = useState<MatatuMovedPayload['waiting_ahead']>([])

  // FIX: simRunning is the ONLY authoritative live-state flag.
  // isOnline mirrors the DB `is_active` column and is used only for UI labelling.
  // We no longer combine them with || for the toggle decision.
  const [isOnline,    setIsOnline]    = useState(false)
  const [simRunning,  setSimRunning]  = useState(false)
  const [simStarting, setSimStarting] = useState(false)
  const [loadingRoute, setLoadingRoute] = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [currentPayload, setCurrentPayload] = useState<MatatuMovedPayload | null>(null)

  const socketRef = useRef<Socket | null>(null)

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

  // ── Load driver profile + route geometry ──────────────────────────────────
  useEffect(() => {
    if (!token || !user?.id) return

    const load = async () => {
      setLoadingRoute(true)
      try {
        const profileRes = await fetch(`${API}/driver/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!profileRes.ok) throw new Error('Failed to load driver profile')
        const { profile } = await profileRes.json()

        const rId = profile.route_id
        setRouteId(rId)
        setRouteName(profile.route_name   ?? '')
        setRouteColour(profile.route_colour ?? '#1D9E75')

        // ── FIX: Get authoritative sim status from server ────────────────────
        // The DB `is_active` column can be stale (e.g. server restart left it
        // true). Always trust the live /status endpoint instead.
        let actuallyRunning = false
        try {
          const simRes = await fetch(`${API}/sim/driver/${user.id}/status`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (simRes.ok) {
            const simData = await simRes.json()
            actuallyRunning = simData.simulation_active ?? false
          }
        } catch {
          // If status check fails, assume not running (safe default)
          actuallyRunning = false
        }

        setSimRunning(actuallyRunning)
        setIsOnline(actuallyRunning)  // keep DB in sync with reality

        // If DB says active but sim is NOT running, patch DB to false
        // so we don't get a forever "Go offline" button with nothing happening
        if (profile.is_active && !actuallyRunning) {
          fetch(`${API}/driver/status`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_active: false }),
          }).catch(() => {/* best-effort */})
        }

        if (!rId) return

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

  // ── Socket connection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!routeId || !user?.id) return

    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join:route', routeId)
      socket.emit('join:driver', user.id)
    })

    socket.on('matatu:moved', (payload: MatatuMovedPayload) => {
      if (Number(payload.driver_id) !== Number(user.id)) return

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

      // If we receive a position update the sim is definitely running
      setSimRunning(true)
      setIsOnline(true)
    })

    socket.on('matatu:direction_changed', (data: any) => {
      if (Number(data.driver_id) !== Number(user.id)) return
      setDriverPosition(prev =>
        prev ? { ...prev, direction: data.direction } : prev
      )
    })

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

    // FIX: Listen for sim-stopped event so UI updates immediately when server
    // stops the simulation (e.g. from admin panel or auto-stop)
    socket.on(`driver:${user.id}:sim_stopped`, () => {
      setSimRunning(false)
      setIsOnline(false)
      setDriverPosition(null)
      toast('🔴 Simulation stopped', { duration: 3000 })
    })

    return () => {
      socket.emit('leave:route', routeId)
      socket.emit('leave:driver', user.id)
      socket.disconnect()
      socketRef.current = null
    }
  }, [routeId, user?.id])

  // ── Go live ────────────────────────────────────────────────────────────────
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || `Server error (${res.status})`)
      }

      await fetch(`${API}/driver/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: true }),
      })

      // FIX: set both flags together — they should always agree
      setIsOnline(true)
      setSimRunning(true)
    } catch (e: any) {
      console.error('goLive error:', e)
      toast.error(e.message || 'Failed to go live. Try again.')
    } finally {
      setSimStarting(false)
    }
  }, [token, user?.id])

  // ── Go offline ─────────────────────────────────────────────────────────────
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
      // FIX: clear both flags and position together
      setIsOnline(false)
      setSimRunning(false)
      setDriverPosition(null)
    } catch (e: any) {
      console.error('goOffline error:', e)
      toast.error('Failed to go offline. Try again.')
    }
  }, [token, user?.id])

  // FIX: Use simRunning alone (not simRunning || isOnline) as source of truth.
  // The old logic meant a stale DB is_active=true would make the button say
  // "Go Offline" even when no sim was running — clicking it would call goOffline
  // unnecessarily and the driver would have to press twice to go live.
  const toggleOnlineStatus = useCallback(async () => {
    if (simRunning) await goOffline()
    else await goLive()
  }, [simRunning, goLive, goOffline])

  // ── Accept a waiting passenger ─────────────────────────────────────────────
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

  // ── Mark passenger as boarded ──────────────────────────────────────────────
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