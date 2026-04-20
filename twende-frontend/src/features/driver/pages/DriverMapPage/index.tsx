// src/features/driver/pages/DriverMapPage/index.tsx
// Redesigned to match the passenger MapPage aesthetic (glassmorphic, DM Sans,
// #1D9E75 accent) while keeping 100 % of the driver functionality.

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapContainer, TileLayer, Polyline,
  CircleMarker, Popup, useMap,
} from 'react-leaflet'
import {
  ChevronLeft, WifiOff, Loader2, BusFront,
  Radio, RadioTower, Crosshair,
} from 'lucide-react'
import toast from 'react-hot-toast'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useDriverMap } from './useDriverMap'
import DriverOwnMarker from './DriverOwnMarker'
import WaitingPassengerPin from './WaitingPassengerPin'
import WaitingBottomSheet from './WaitingBottomSheet'
import DriverBottomSheet from './DriverBottomSheet'
import type { StopWaitGroup } from './types'
import './mappage-driver.css'

// ── Auto-fit route on first load ──────────────────────────────────────────────
const FitRoute: React.FC<{ path: [number, number][] }> = ({ path }) => {
  const map    = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (path.length > 1 && !fitted.current) {
      map.fitBounds(L.latLngBounds(path), { padding: [70, 70], maxZoom: 15 })
      fitted.current = true
    }
  }, [path, map])
  return null
}

// ── Recenter button (inside MapContainer so it can call useMap) ───────────────
const RecenterBtn: React.FC<{
  position: [number, number] | null
  onMapInteract: () => void
}> = ({ position, onMapInteract }) => {
  const map = useMap()

  useEffect(() => {
    const handler = () => onMapInteract()
    map.on('drag', handler)
    return () => { map.off('drag', handler) }
  }, [map, onMapInteract])

  if (!position) return null
  return (
    <button
      className="mp-recenter-btn"
      onClick={e => {
        e.stopPropagation()
        map.panTo(position, { animate: true, duration: 0.8 })
      }}
      aria-label="Re-centre map"
    >
      <Crosshair size={18} strokeWidth={2} />
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const DriverMapPage: React.FC = () => {
  const navigate      = useNavigate()
  const { user }      = useAuth()
  const { theme }     = useTheme()
  const isDark        = theme === 'dark'

  const [selectedGroup, setSelectedGroup] = useState<StopWaitGroup | null>(null)
  const [autoCenter,    setAutoCenter]    = useState(true)

  const {
    routeName, routeColour,
    waypoints, stops,
    driverPosition, waitingByStop, waitingAhead, stopsETA, nextStop,
    currentPayload,
    isOnline, simRunning, simStarting,
    loadingRoute, error,
    acceptPassenger, markBoarded, toggleOnlineStatus,
  } = useDriverMap()

  const handleMapInteract = useCallback(() => {
    setAutoCenter(false)
    setSelectedGroup(null)
  }, [])

  const polylinePath: [number, number][] =
    waypoints.map(w => [w.lat, w.lng])

  const mapCenter: [number, number] = driverPosition
    ? [driverPosition.lat, driverPosition.lng]
    : [-1.2921, 36.8219]

  const totalWaiting = waitingByStop.reduce((s, g) => s + g.passengers.length, 0)
  const isLive       = simRunning || isOnline

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  const attribution = isDark
    ? '&copy; <a href="https://carto.com">CARTO</a>'
    : '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingRoute) {
    return (
      <div className={`mp-root ${isDark ? 'dmp-dark' : 'dmp-light'}`}>
        <div className="mp-loading-overlay">
          <div className="mp-loading-card">
            <div className="mp-loading-icon">
              <BusFront size={30} className="text-[#1D9E75]" strokeWidth={2} />
              <Loader2 size={14} className="mp-loading-spinner text-white animate-spin" />
            </div>
            <p className="mp-loading-title">Loading your route…</p>
            <p className="mp-loading-sub">Setting up the driver view</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={`mp-root ${isDark ? 'dmp-dark' : 'dmp-light'}`}>
        <div className="mp-loading-overlay">
          <div className="mp-loading-card">
            <p style={{ color: '#ef4444', fontWeight: 700, margin: 0 }}>{error}</p>
            <button
              onClick={() => navigate(-1)}
              style={{
                marginTop: 12, padding: '10px 22px',
                background: '#1D9E75', color: 'white', border: 'none',
                borderRadius: 12, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`mp-root ${isDark ? 'dmp-dark' : 'dmp-light'}`}>

      {/* ── TOP BAR ── */}
      <div className="mp-topbar-wrapper">
        <div className="mp-topbar-fade" />
        <div className="mp-topbar">

          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="mp-icon-btn"
            aria-label="Back"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>

          {/* Route name pill */}
          <div className="mp-route-pill">
            <span className="mp-route-label">Driver Mode</span>
            <span className="mp-route-name">
              {routeName || `Route`}
            </span>
          </div>

          {/* Go Live / Offline pill */}
          <button
            onClick={toggleOnlineStatus}
            disabled={simStarting}
            className={`mp-status-chip mp-go-live-btn ${isLive ? 'mp-status-live' : 'mp-status-offline'}`}
            aria-label={isLive ? 'Go offline' : 'Go live'}
          >
            {simStarting ? (
              <span className="mp-live-dot" style={{ opacity: 0.6 }} />
            ) : isLive ? (
              <>
                <span className="mp-live-dot" />
                <RadioTower size={11} strokeWidth={2.5} />
                Live
              </>
            ) : (
              <>
                <Radio size={11} strokeWidth={2.5} />
                Go Live
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── MAP ── */}
      <MapContainer
        center={mapCenter}
        zoom={14}
        zoomControl={false}
        className="mp-map"
        maxZoom={19}
      >
        <TileLayer
          key={tileUrl}
          url={tileUrl}
          attribution={attribution}
          maxZoom={19}
        />

        <FitRoute path={polylinePath} />

        {/* Route polyline — 3-layer glow (same as passenger page) */}
        {polylinePath.length > 1 && (
          <>
            <Polyline
              positions={polylinePath}
              pathOptions={{ color: routeColour, weight: 22, opacity: 0.06, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={polylinePath}
              pathOptions={{ color: routeColour, weight: 5, opacity: 0.90, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={polylinePath}
              pathOptions={{ color: '#7EEDC8', weight: 2, opacity: 0.70, lineCap: 'round', lineJoin: 'round' }}
            />
          </>
        )}

        {/* Stop circle markers */}
        {stops.map((stop, idx) => {
          const isTerminus = idx === 0 || idx === stops.length - 1
          const eta        = stopsETA.find(s => s.id === stop.id)
          const isUpcoming = eta?.is_upcoming ?? true

          return (
            <CircleMarker
              key={stop.id}
              center={[parseFloat(stop.lat as any), parseFloat(stop.lng as any)]}
              radius={isTerminus ? 9 : 5}
              fillColor={isTerminus ? routeColour : (isDark ? '#ffffff' : routeColour)}
              color={routeColour}
              weight={isTerminus ? 2.5 : 1.5}
              fillOpacity={isUpcoming ? 1 : 0.35}
              opacity={isUpcoming ? 1 : 0.4}
            >
              <Popup>
                <div style={{ fontFamily: '"DM Sans", sans-serif', minWidth: 130 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 13 }}>{stop.name}</p>
                  {eta?.eta_minutes != null && (
                    <p style={{ margin: '4px 0 0', color: routeColour, fontWeight: 700, fontSize: 12 }}>
                      {isUpcoming ? `ETA: ${eta.eta_minutes} min` : 'Passed'}
                    </p>
                  )}
                  {isTerminus && (
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>
                      {idx === 0 ? 'Origin' : 'Terminus'}
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

        {/* Waiting passenger pins */}
        {waitingByStop.map(group => (
          <WaitingPassengerPin
            key={group.stop_id}
            group={group}
            onClick={g => { setSelectedGroup(g); setAutoCenter(false) }}
          />
        ))}

        {/* Driver's own animated marker */}
        {driverPosition && (
          <DriverOwnMarker
            lat={driverPosition.lat}
            lng={driverPosition.lng}
            routeColour={routeColour}
            autoCenter={autoCenter}
            payload={currentPayload}
          />
        )}

        <RecenterBtn
          position={driverPosition ? [driverPosition.lat, driverPosition.lng] : null}
          onMapInteract={handleMapInteract}
        />
      </MapContainer>

      {/* ── NO POSITION OVERLAY (if live but no GPS yet) ── */}
      {isLive && !driverPosition && (
        <div className="mp-loading-overlay" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="mp-loading-card">
            <div className="mp-loading-icon">
              <BusFront size={30} style={{ color: routeColour }} strokeWidth={2} />
              <Loader2 size={14} className="mp-loading-spinner animate-spin" style={{ background: routeColour }} />
            </div>
            <p className="mp-loading-title">
              {simStarting ? 'Starting simulation…' : 'Waiting for GPS…'}
            </p>
            <p className="mp-loading-sub">Your position will appear shortly</p>
          </div>
        </div>
      )}

      {/* ── BOTTOM SHEET ── */}
      <DriverBottomSheet
        driverPosition={driverPosition}
        waitingByStop={waitingByStop}
        waitingAhead={waitingAhead}
        nextStop={nextStop}
        currentPayload={currentPayload}
        stopsETA={stopsETA}
        totalWaiting={totalWaiting}
        isLive={isLive}
        simStarting={simStarting}
        routeColour={routeColour}
        onToggleLive={toggleOnlineStatus}
        onSelectGroup={g => { setSelectedGroup(g); setAutoCenter(false) }}
      />

      {/* ── WAITING PASSENGERS BOTTOM SHEET (detail) ── */}
      {selectedGroup && (
        <WaitingBottomSheet
          group={selectedGroup}
          myDriverId={user?.id ?? 0}
          onClose={() => setSelectedGroup(null)}
          onAccept={acceptPassenger}
          onBoard={markBoarded}
        />
      )}
    </div>
  )
}

export default DriverMapPage