// src/features/driver/pages/DriverMapPage/DriverOwnMarker.tsx
// Uses the same DivIcon system as the passenger page (map-bus-marker classes)
// so the driver's own bus looks identical to how a passenger sees it.

import React from 'react'
import { Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { MatatuMovedPayload } from './types'

interface Props {
  lat:          number
  lng:          number
  routeColour:  string
  autoCenter?:  boolean
  payload?:     MatatuMovedPayload | null
}

const DriverOwnMarker: React.FC<Props> = ({ lat, lng, routeColour, autoCenter, payload }) => {
  const map = useMap()

  React.useEffect(() => {
    if (autoCenter) map.panTo([lat, lng], { animate: true, duration: 0.8 })
  }, [lat, lng, autoCenter, map])

  const isWaiting = payload?.is_waiting ?? false
  const plate     = payload?.plate_number ?? 'YOU'

  // Mirror the passenger createBusIcon approach but use routeColour
  const bodyBg = isWaiting
    ? 'linear-gradient(145deg,#fbbf24,#f59e0b)'
    : `linear-gradient(145deg,${routeColour}dd,${routeColour})`

  const iconHtml = renderToStaticMarkup(
    <div className="map-bus-marker map-bus-selected">
      <div className="map-bus-pulse map-bus-pulse-on" />
      <div
        className="map-bus-body"
        style={{
          background: bodyBg,
          boxShadow: isWaiting
            ? '0 4px 0 rgba(0,0,0,0.2),0 0 0 3px rgba(245,158,11,0.25)'
            : '0 4px 0 rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.25)',
        }}
      >
        {/* Bus SVG */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6v6"/><path d="M15 6v6"/>
          <path d="M2 12h19.6"/>
          <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
          <circle cx="7" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
        </svg>
      </div>
      <div className={`map-bus-plate ${isWaiting ? 'map-plate-paused' : ''}`}>
        {isWaiting ? '⏸ ' : '📍 '}{plate}
      </div>
    </div>
  )

  const icon = L.divIcon({
    html:       iconHtml,
    className:  '',
    iconSize:   [72, 76],
    iconAnchor: [36, 76],
    popupAnchor: [0, -80],
  })

  const onboard  = payload?.current_passengers ?? []
  const speed    = payload ? Math.round(payload.speed) : 0
  const pct      = payload?.progress_percent ?? 0
  const dir      = payload?.direction ?? 'forward'

  return (
    <Marker position={[lat, lng]} icon={icon} zIndexOffset={1000}>
      <Popup
        className="mp-popup"
        closeButton={false}
        maxWidth={300}
        minWidth={260}
      >
        <div style={{
          fontFamily: '"DM Sans", sans-serif',
          background: 'white',
          borderRadius: 20,
          overflow: 'hidden',
          minWidth: 260,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 13,
              background: routeColour,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6v6"/><path d="M15 6v6"/>
                <path d="M2 12h19.6"/>
                <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
                <circle cx="7" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 14, color: '#0A0F0D', lineHeight: 1.2 }}>
                {payload?.driver_name ?? 'You'}
              </p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(10,15,13,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {plate}
              </p>
            </div>
            {isWaiting ? (
              <span style={{
                fontSize: 9, fontWeight: 900, padding: '3px 9px', borderRadius: 99,
                background: 'rgba(245,158,11,0.12)', color: '#d97706',
                border: '1px solid rgba(245,158,11,0.3)',
              }}>⏸ Stopped</span>
            ) : (
              <span style={{
                fontSize: 9, fontWeight: 900, padding: '3px 9px', borderRadius: 99,
                background: 'rgba(29,158,117,0.12)', color: routeColour,
                border: `1px solid ${routeColour}40`,
              }}>● Live</span>
            )}
          </div>

          {/* Stats chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '0 16px 10px' }}>
            {[
              { label: `${speed} km/h` },
              { label: dir === 'forward' ? '→ Outbound' : '← Return' },
              { label: `${pct}% route` },
            ].map(item => (
              <span key={item.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 99,
                fontSize: 10, fontWeight: 800,
                background: 'rgba(10,15,13,0.05)',
                color: 'rgba(10,15,13,0.6)',
                border: '1px solid rgba(10,15,13,0.08)',
              }}>
                {item.label}
              </span>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ margin: '0 16px 12px', padding: '10px 12px', background: 'rgba(10,15,13,0.04)', borderRadius: 12 }}>
            <div style={{ height: 7, borderRadius: 99, background: 'rgba(10,15,13,0.08)', overflow: 'hidden', marginBottom: 7 }}>
              <div style={{
                height: '100%', width: `${pct}%`, borderRadius: 99,
                background: `linear-gradient(90deg,${routeColour},${routeColour}cc)`,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: routeColour }}>
              {onboard.length}/{payload?.capacity ?? 14} passengers on board
            </p>
          </div>

          {/* Passengers */}
          {onboard.length > 0 && (
            <div style={{ padding: '10px 16px 14px', borderTop: '1px solid rgba(10,15,13,0.07)' }}>
              <p style={{ margin: '0 0 7px', fontSize: 9, fontWeight: 800, color: 'rgba(10,15,13,0.35)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                On board
              </p>
              {onboard.slice(0, 3).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: routeColour,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 9, fontWeight: 900, flexShrink: 0,
                  }}>
                    {(p.passenger_name || 'P')[0].toUpperCase()}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(10,15,13,0.65)', flex: 1 }}>
                    {p.passenger_name}
                    {p.destination ? ` → ${p.destination}` : ''}
                  </p>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 99,
                    background: p.paid_via_mpesa ? '#dcfce7' : '#fef3c7',
                    color:      p.paid_via_mpesa ? '#16a34a' : '#d97706',
                  }}>
                    {p.payment_display}
                  </span>
                </div>
              ))}
              {onboard.length > 3 && (
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>
                  +{onboard.length - 3} more
                </p>
              )}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

export default DriverOwnMarker