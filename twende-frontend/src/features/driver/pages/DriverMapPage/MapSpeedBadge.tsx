// src/features/driver/pages/DriverMapPage/MapSpeedBadge.tsx
import React from 'react'
import { ArrowUp, ArrowDown, Users} from 'lucide-react'
import type { RouteStop, WaitingAheadPassenger } from './types'

interface Props {
  speed:        number
  direction?:   'forward' | 'backward'
  nextStop:     RouteStop | null
  waitingCount: number
  waitingAhead: WaitingAheadPassenger[]
  isWaiting:    boolean
}

const MapSpeedBadge: React.FC<Props> = ({
  speed, direction, nextStop, waitingCount, waitingAhead, isWaiting,
}) => {
  const closestWaiting = waitingAhead.length > 0
    ? waitingAhead.reduce((a, b) => a.eta_minutes < b.eta_minutes ? a : b)
    : null

  return (
    <>
      {/* ── Speed + direction badge (top-right) ─────────────────────────── */}
      <div className="dmap-speed-badge">
        {isWaiting ? (
          <>
            <span className="dmap-speed-value" style={{ fontSize: '1rem', color: '#f59e0b' }}>
              STOP
            </span>
            <span className="dmap-speed-unit">picking up</span>
          </>
        ) : (
          <>
            <span className="dmap-speed-value">{Math.round(speed)}</span>
            <span className="dmap-speed-unit">km/h</span>
          </>
        )}

        {/* Direction indicator */}
        {direction && !isWaiting && (
          <div className="dmap-direction-row">
            {direction === 'forward'
              ? <ArrowUp size={10} strokeWidth={3} className="dmap-dir-arrow forward" />
              : <ArrowDown size={10} strokeWidth={3} className="dmap-dir-arrow backward" />
            }
            <span className="dmap-dir-label">
              {direction === 'forward' ? 'Outbound' : 'Return'}
            </span>
          </div>
        )}

        {/* Next stop ETA */}
        {nextStop && (
          <div className="dmap-next-stop">
            <span className="dmap-eta-value">
              {nextStop.eta_minutes != null ? `${nextStop.eta_minutes}m` : '—'}
            </span>
            <span className="dmap-eta-label" title={nextStop.name}>
              {nextStop.name}
            </span>
          </div>
        )}
      </div>

      {/* ── Waiting passengers badge (top-left) ─────────────────────────── */}
      {(waitingCount > 0 || closestWaiting) && (
        <div className="dmap-waiting-badge">
          <div className="dmap-waiting-inner">
            <Users size={13} strokeWidth={2.5} className="dmap-waiting-icon" />
            <span className="dmap-speed-value dmap-waiting-count">{waitingCount}</span>
          </div>
          <span className="dmap-speed-unit">waiting</span>

          {/* Closest waiting passenger ETA */}
          {closestWaiting && (
            <div className="dmap-next-stop">
              <div className="dmap-waiting-dot" />
              <span className="dmap-eta-value" style={{ color: '#ef4444' }}>
                {closestWaiting.eta_minutes}m
              </span>
              <span className="dmap-eta-label" title={closestWaiting.name}>
                {closestWaiting.name}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default MapSpeedBadge