// src/features/passenger/pages/MapPage/BottomSheet.tsx
import React, { useState } from 'react';
import {
  Bus, Navigation, Users, Clock,
  ChevronUp, ChevronDown, Star,
  AlertTriangle, WifiOff, X, MapPin,
} from 'lucide-react';
import type { Driver, Stop, WaitingInfo, WaitingStatus } from './types';
import { toNum, hasPosition, driverKey, etaLabel } from './types';

interface Props {
  drivers:         Driver[];
  stops:           Stop[];
  selectedDriver:  Driver | null;
  onSelectDriver:  (d: Driver | null) => void;
  socketConnected: boolean;
  loading:         boolean;
  onViewMatatu:    (plate: string) => void;
  onToggleNotify:  () => void;
  notifyEnabled:   boolean;
  // ── Waiting ──────────────────────────────────────────────────────────────
  waitingStatus:   WaitingStatus;
  waitingInfo:     WaitingInfo | null;
  onOpenWaiting:   () => void;
}

const ETAChip: React.FC<{ mins: number }> = ({ mins }) => (
  <span className={`bs-eta-chip ${
    mins <= 2 ? 'bs-eta-arriving' : mins <= 5 ? 'bs-eta-soon' : 'bs-eta-later'
  }`}>
    {etaLabel(mins)}
  </span>
);

const BottomSheet: React.FC<Props> = ({
  drivers, stops, selectedDriver, onSelectDriver,
  socketConnected, loading, onViewMatatu, onToggleNotify, notifyEnabled,
  waitingStatus, waitingInfo, onOpenWaiting,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab]           = useState<'matatus' | 'stops'>('matatus');

  const visible = drivers.filter(hasPosition);

  const isWaiting  = waitingStatus === 'waiting';
  const isOnboard  = waitingStatus === 'onboard' || waitingStatus === 'arriving';

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

      {/* ── Warnings ── */}
      {!socketConnected && !loading && (
        <div className="bs-warning">
          <WifiOff size={13} strokeWidth={2.5} />
          <span>Real-time disconnected — last known positions shown</span>
        </div>
      )}
      {!loading && visible.length === 0 && (
        <div className="bs-warning bs-warning-amber">
          <AlertTriangle size={13} strokeWidth={2.5} />
          <span>No active matatus on this route right now</span>
        </div>
      )}

      {/* ── Stat pills ── */}
      <div className="bs-stats">
        <div className="bs-stat">
          <Bus size={16} className="bs-stat-green" strokeWidth={2.5} />
          <span className="bs-stat-val">{visible.length}</span>
          <span className="bs-stat-lbl">Active</span>
        </div>
        <div className="bs-stat-sep" />
        <div className="bs-stat">
          <Navigation size={16}
            className={socketConnected ? 'bs-stat-green' : 'bs-stat-amber'}
            strokeWidth={2.5}
          />
          <span className="bs-stat-val">{socketConnected ? 'Live' : 'Polling'}</span>
          <span className="bs-stat-lbl">GPS</span>
        </div>
        <div className="bs-stat-sep" />
        <div className="bs-stat">
          <Users size={16} className="bs-stat-blue" strokeWidth={2.5} />
          <span className="bs-stat-val">
            {visible.reduce((s, d) => s + (d.passengers ?? 0), 0)}
          </span>
          <span className="bs-stat-lbl">On board</span>
        </div>
        <div className="bs-stat-sep" />
        <div className="bs-stat">
          <Clock size={16} className="bs-stat-purple" strokeWidth={2.5} />
          <span className="bs-stat-val">
            {visible.length > 0 && visible[0].stops_eta?.length
              ? etaLabel(Math.min(...visible[0].stops_eta.map(s => s.eta_minutes)))
              : '—'
            }
          </span>
          <span className="bs-stat-lbl">Next ETA</span>
        </div>
      </div>

      {/* ── Selected driver card ── */}
      {selectedDriver && (
        <div className="bs-selected">
          <div className="bs-sel-avatar">
            <Bus size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="bs-sel-info">
            <p className="bs-sel-name">{selectedDriver.driver_name}</p>
            <p className="bs-sel-plate">
              {selectedDriver.plate_number}
              {selectedDriver.is_waiting && (
                <span className="bs-sel-stopped"> · ⏸ Stopped</span>
              )}
            </p>
          </div>
          {toNum(selectedDriver.average_rating) > 0 && (
            <div className="bs-sel-rating">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span>{toNum(selectedDriver.average_rating).toFixed(1)}</span>
            </div>
          )}
          {selectedDriver.stops_eta && selectedDriver.stops_eta.length > 0 && (
            <ETAChip mins={Math.min(...selectedDriver.stops_eta.map(s => s.eta_minutes))} />
          )}
          <button
            className="bs-view-btn"
            onClick={() => onViewMatatu(selectedDriver.plate_number)}
          >
            Details
          </button>
          <button
            type="button"
            className="bs-close-btn"
            onClick={() => onSelectDriver(null)}
            aria-label="Close"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── Expanded tabs ── */}
      {expanded && (
        <>
          <div className="bs-tabs">
            {(['matatus', 'stops'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`bs-tab ${tab === t ? 'bs-tab-active' : ''}`}
              >
                {t === 'matatus' ? `Matatus (${visible.length})` : `Route stops (${stops.length})`}
              </button>
            ))}
          </div>

          <div className="bs-content">

            {/* Matatus list */}
            {tab === 'matatus' && (
              <div className="bs-list">
                {visible.length === 0 && (
                  <p className="bs-empty">No active matatus right now</p>
                )}
                {visible.map(d => {
                  const isSelected = selectedDriver ? driverKey(selectedDriver) === driverKey(d) : false;
                  const pax        = d.passengers ?? 0;
                  const cap        = d.capacity ?? 14;
                  const fillPct    = Math.min(100, Math.round((pax / cap) * 100));
                  const bestETA    = d.stops_eta?.length
                    ? Math.min(...d.stops_eta.map(s => s.eta_minutes))
                    : null;

                  return (
                    <button
                      key={driverKey(d)}
                      className={`bs-matatu-row ${isSelected ? 'bs-matatu-row-sel' : ''}`}
                      onClick={() => onSelectDriver(isSelected ? null : d)}
                    >
                      <div className={`bs-matatu-dot ${d.is_waiting ? 'dot-waiting' : 'dot-moving'}`} />
                      <div className="bs-matatu-info">
                        <p className="bs-matatu-plate">{d.plate_number}</p>
                        <p className="bs-matatu-driver">{d.driver_name}</p>
                        <div className="bs-mini-bar-track">
                          <div
                            className="bs-mini-bar-fill"
                            style={{
                              width: `${fillPct}%`,
                              background: fillPct >= 100
                                ? '#ef4444'
                                : fillPct > 70 ? '#f59e0b' : '#1D9E75',
                            }}
                          />
                        </div>
                        <p className="bs-matatu-pax">{pax}/{cap} passengers</p>
                      </div>
                      <div className="bs-matatu-right">
                        {bestETA !== null && <ETAChip mins={bestETA} />}
                        {toNum(d.average_rating) > 0 && (
                          <div className="bs-matatu-rating">
                            <Star size={10} className="text-amber-400 fill-amber-400" />
                            <span>{toNum(d.average_rating).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Stops list */}
            {tab === 'stops' && (
              <div className="bs-stops">
                {stops.length === 0 && (
                  <p className="bs-empty">No stop data for this route</p>
                )}
                {stops.map((stop, idx) => {
                  const isFirst = idx === 0;
                  const isLast  = idx === stops.length - 1;
                  const bestETA = visible
                    .flatMap(d => d.stops_eta ?? [])
                    .filter(s => s.id === stop.id)
                    .sort((a, b) => a.eta_minutes - b.eta_minutes)[0];

                  const isWaitingHere = isWaiting && waitingInfo?.stop_id === stop.id;

                  return (
                    <div key={stop.id} className={`bs-stop-row ${isWaitingHere ? 'bs-stop-row-waiting' : ''}`}>
                      <div className="bs-stop-timeline">
                        <div className={`bs-stop-line ${isFirst ? 'invisible' : ''}`} />
                        <div className={`bs-stop-dot ${isFirst || isLast ? 'bs-stop-dot-terminus' : ''} ${isWaitingHere ? 'bs-stop-dot-waiting' : ''}`} />
                        <div className={`bs-stop-line ${isLast ? 'invisible' : ''}`} />
                      </div>
                      <div className="bs-stop-body">
                        <span className={`bs-stop-name ${isFirst || isLast ? 'bs-stop-name-bold' : ''}`}>
                          {stop.name}
                        </span>
                        {(isFirst || isLast) && (
                          <span className="bs-stop-badge">{isFirst ? 'Origin' : 'Terminus'}</span>
                        )}
                        {isWaitingHere && (
                          <span className="bs-stop-badge bs-stop-badge-waiting">📍 You're here</span>
                        )}
                      </div>
                      {bestETA && <ETAChip mins={bestETA.eta_minutes} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Waiting status strip (shown when actively waiting) ── */}
      {isWaiting && waitingInfo && (
        <div className="bs-waiting-strip">
          <div className="bs-waiting-ping" />
          <div className="bs-waiting-info">
            <span className="bs-waiting-label">Waiting at</span>
            <span className="bs-waiting-stop">{waitingInfo.stop_name}</span>
            {waitingInfo.destination_name && (
              <span className="bs-waiting-dest"> → {waitingInfo.destination_name}</span>
            )}
          </div>
          <button className="bs-waiting-manage" onClick={onOpenWaiting}>
            <MapPin size={12} />
            Manage
          </button>
        </div>
      )}

      {/* ── Action buttons row ── */}
      <div className="bs-actions">
        {/* Flag matatu / Cancel waiting button */}
        {!isOnboard && (
          <button
            onClick={onOpenWaiting}
            className={`bs-flag-btn ${isWaiting ? 'bs-flag-btn-active' : ''}`}
          >
            {isWaiting ? (
              <>
                <span className="bs-flag-pulse" />
                📍 You're waiting — tap to manage
              </>
            ) : (
              '🚩 Flag a matatu'
            )}
          </button>
        )}

        {/* Notify button */}
        {!isOnboard && (
          <button
            onClick={onToggleNotify}
            className={`bs-notify-btn ${notifyEnabled ? 'bs-notify-active' : ''}`}
          >
            {notifyEnabled ? '🔔 On' : '🔔'}
          </button>
        )}
      </div>
    </div>
  );
};

export default BottomSheet;