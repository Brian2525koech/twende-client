// src/features/driver/pages/DriverMapPage/DriverBottomSheet.tsx
// Passenger-style bottom sheet for the driver view.
// Shows: stats, live status, next stop ETA, waiting passengers list, stops list.

import React, { useState } from 'react'
import {
  Navigation, Users, Clock,
  ChevronUp, ChevronDown, AlertTriangle,
  MapPin, ArrowUp, ArrowDown, Zap, Radio, RadioTower,
} from 'lucide-react'
import type {
  DriverPosition, WaitingAheadPassenger, StopWaitGroup,
  MatatuMovedPayload, RouteStop,
} from './types'

interface Props {
  driverPosition:  DriverPosition | null
  waitingByStop:   StopWaitGroup[]
  waitingAhead:    WaitingAheadPassenger[]
  nextStop:        RouteStop | null
  currentPayload:  MatatuMovedPayload | null
  stopsETA:        RouteStop[]
  totalWaiting:    number
  isLive:          boolean
  simStarting:     boolean
  routeColour:     string
  onToggleLive:    () => void
  onSelectGroup:   (g: StopWaitGroup) => void
}

const ETAChip: React.FC<{ mins: number }> = ({ mins }) => (
  <span className={`bs-eta-chip ${
    mins <= 2 ? 'bs-eta-arriving' : mins <= 5 ? 'bs-eta-soon' : 'bs-eta-later'
  }`}>
    {mins <= 0 ? 'Here now' : mins === 1 ? '1 min' : `${mins} min`}
  </span>
)

const DriverBottomSheet: React.FC<Props> = ({
  driverPosition, waitingByStop, waitingAhead, nextStop,
  currentPayload, stopsETA, totalWaiting,
  isLive, simStarting, routeColour,
  onToggleLive, onSelectGroup,
}) => {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'waiting' | 'stops'>('waiting')

  const speed   = driverPosition?.speed ?? 0
  const dir     = driverPosition?.direction ?? 'forward'
  const pax     = currentPayload?.current_passengers?.length ?? 0
  const cap     = currentPayload?.capacity ?? 14
  const isStop  = currentPayload?.is_waiting ?? false

  const nextETA = nextStop?.eta_minutes ?? null

  // Best ETA among waiting-ahead passengers
  const closestWaiting = waitingAhead.length > 0
    ? waitingAhead.reduce((a, b) => a.eta_minutes < b.eta_minutes ? a : b)
    : null

  return (
    <div className="bs-root">

      {/* ── Pill handle ── */}
      <button className="bs-handle" onClick={() => setExpanded(e => !e)}>
        <span className="bs-handle-bar" />
        {expanded
          ? <ChevronDown size={14} className="bs-handle-chevron" />
          : <ChevronUp   size={14} className="bs-handle-chevron" />
        }
      </button>

      {/* ── Offline warning ── */}
      {!isLive && (
        <div className="bs-warning bs-warning-amber">
          <AlertTriangle size={13} strokeWidth={2.5} />
          <span>You are offline — press Go Live to start broadcasting</span>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="bs-stats">

        {/* Speed / stopped */}
        <div className="bs-stat">
          <Zap size={16} className={isStop ? 'bs-stat-amber' : 'bs-stat-green'} strokeWidth={2.5} />
          <span className="bs-stat-val">
            {isStop ? 'STOP' : `${Math.round(speed)}`}
          </span>
          <span className="bs-stat-lbl">{isStop ? 'Picking up' : 'km/h'}</span>
        </div>

        <div className="bs-stat-sep" />

        {/* Direction */}
        <div className="bs-stat">
          {dir === 'forward'
            ? <ArrowUp   size={16} className="bs-stat-green"  strokeWidth={2.5} />
            : <ArrowDown size={16} className="bs-stat-amber"  strokeWidth={2.5} />
          }
          <span className="bs-stat-val">{dir === 'forward' ? 'Out' : 'Ret'}</span>
          <span className="bs-stat-lbl">{dir === 'forward' ? 'Outbound' : 'Return'}</span>
        </div>

        <div className="bs-stat-sep" />

        {/* Passengers on board */}
        <div className="bs-stat">
          <Users size={16} className="bs-stat-blue" strokeWidth={2.5} />
          <span className="bs-stat-val">{pax}/{cap}</span>
          <span className="bs-stat-lbl">On board</span>
        </div>

        <div className="bs-stat-sep" />

        {/* Next stop ETA */}
        <div className="bs-stat">
          <Clock size={16} className="bs-stat-purple" strokeWidth={2.5} />
          <span className="bs-stat-val">
            {nextETA !== null ? `${nextETA}m` : '—'}
          </span>
          <span className="bs-stat-lbl">Next stop</span>
        </div>
      </div>

      {/* ── Next stop card (when live) ── */}
      {isLive && nextStop && (
        <div className="bs-selected">
          <div className="bs-sel-avatar" style={{ background: routeColour }}>
            <Navigation size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="bs-sel-info">
            <p className="bs-sel-name">{nextStop.name}</p>
            <p className="bs-sel-plate">Next stop on route</p>
          </div>
          {nextETA !== null && <ETAChip mins={nextETA} />}
          {closestWaiting && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {waitingAhead.length} waiting ahead
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.4)' }}>
                closest {closestWaiting.eta_minutes}m
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Go Live button (when not live and sheet not expanded) ── */}
      {!isLive && !expanded && (
        <button
          onClick={onToggleLive}
          disabled={simStarting}
          className="bs-notify-btn"
          style={{ background: routeColour }}
        >
          {simStarting ? (
            '⏳ Starting simulation…'
          ) : (
            <><RadioTower size={16} strokeWidth={2.5} /> Go Live — Start Broadcasting</>
          )}
        </button>
      )}

      {/* ── Expanded section ── */}
      {expanded && (
        <>
          <div className="bs-tabs">
            {(['waiting', 'stops'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`bs-tab ${tab === t ? 'bs-tab-active' : ''}`}
              >
                {t === 'waiting'
                  ? `Waiting (${totalWaiting})`
                  : `Stops ahead (${stopsETA.filter(s => s.is_upcoming).length})`
                }
              </button>
            ))}
          </div>

          <div className="bs-content">

            {/* ── Waiting passengers by stop ── */}
            {tab === 'waiting' && (
              <div className="bs-list">
                {waitingByStop.length === 0 && (
                  <p className="bs-empty">No passengers waiting on this route right now</p>
                )}
                {waitingByStop.map(group => {
                  const hasAccepted = group.passengers.some(p => p.status === 'accepted')
                 
                  // Find ETA for this stop from waitingAhead

                  return (
                    <button
                      key={group.stop_id}
                      className="bs-matatu-row"
                      onClick={() => onSelectGroup(group)}
                    >
                      <div className={`bs-matatu-dot ${hasAccepted ? 'dot-moving' : 'dot-waiting'}`} />
                      <div className="bs-matatu-info">
                        <p className="bs-matatu-plate">{group.stop_name}</p>
                        <p className="bs-matatu-driver">
                          {group.passengers.length} passenger{group.passengers.length !== 1 ? 's' : ''} waiting
                          {hasAccepted && ' · some accepted'}
                        </p>
                        {/* Passenger name previews */}
                        <p className="bs-matatu-pax">
                          {group.passengers.slice(0, 2).map(p => p.passenger_name).join(', ')}
                          {group.passengers.length > 2 ? ` +${group.passengers.length - 2} more` : ''}
                        </p>
                      </div>
                      <div className="bs-matatu-right">
                        {/* Use waitingAhead ETA if available */}
                        {waitingAhead
                          .filter(() => group.passengers.some(() => true))
                          .slice(0, 1)
                          .map(w => <ETAChip key={w.id} mins={w.eta_minutes} />)
                        }
                        <MapPin size={12} strokeWidth={2} style={{ color: routeColour, opacity: 0.6 }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Stops ahead ── */}
            {tab === 'stops' && (
              <div className="bs-stops">
                {stopsETA.length === 0 && (
                  <p className="bs-empty">No stop ETA data yet</p>
                )}
                {stopsETA.map((stop, idx) => {
                  const isFirst = idx === 0
                  const isLast  = idx === stopsETA.length - 1
                  const waiting = waitingByStop.find(g => g.stop_id === stop.id)

                  return (
                    <div key={stop.id} className="bs-stop-row">
                      <div className="bs-stop-timeline">
                        <div className={`bs-stop-line ${isFirst ? 'invisible' : ''}`} />
                        <div
                          className={`bs-stop-dot ${isFirst || isLast ? 'bs-stop-dot-terminus' : ''}`}
                          style={isFirst || isLast ? { background: routeColour } : undefined}
                        />
                        <div className={`bs-stop-line ${isLast ? 'invisible' : ''}`} />
                      </div>
                      <div className="bs-stop-body">
                        <span className={`bs-stop-name ${!stop.is_upcoming ? 'dmp-stop-passed' : ''} ${isFirst || isLast ? 'bs-stop-name-bold' : ''}`}>
                          {stop.name}
                        </span>
                        {(isFirst || isLast) && (
                          <span className="bs-stop-badge" style={{ background: `${routeColour}18`, color: routeColour, borderColor: `${routeColour}30` }}>
                            {isFirst ? 'Origin' : 'Terminus'}
                          </span>
                        )}
                        {waiting && (
                          <span className="dmp-waiting-badge-inline">
                            <Users size={9} strokeWidth={2.5} />
                            {waiting.passengers.length}
                          </span>
                        )}
                      </div>
                      {stop.eta_minutes != null && stop.is_upcoming && (
                        <ETAChip mins={stop.eta_minutes} />
                      )}
                      {!stop.is_upcoming && (
                        <span className="dmp-passed-label">Passed</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Go Live / Offline button at bottom of expanded sheet */}
          <button
            onClick={onToggleLive}
            disabled={simStarting}
            className={`bs-notify-btn ${isLive ? 'bs-notify-active dmp-offline-btn' : ''}`}
            style={!isLive ? { background: routeColour } : undefined}
          >
            {simStarting ? (
              '⏳ Starting simulation…'
            ) : isLive ? (
              <><Radio size={15} strokeWidth={2.5} /> Go Offline</>
            ) : (
              <><RadioTower size={15} strokeWidth={2.5} /> Go Live — Start Broadcasting</>
            )}
          </button>
        </>
      )}
    </div>
  )
}

export default DriverBottomSheet