// src/features/admin/pages/SimulationPage/SimDriverCard.tsx
import React from 'react';
import {
  Play, Square, Bus, Star, Navigation,
  ChevronDown, ChevronUp, Map as MapIcon,
  RefreshCw, Zap, AlertCircle,
} from 'lucide-react';
import type { DriverRow } from './types';
import { SPEED_OPTIONS, formatProgress } from './types';
import OnboardList from './OnboardList';
import RoutePreviewMap from './RoutePreviewMap';

interface Props {
  driver:       DriverRow;
  selectedSpeed: number;
  isStarting:   boolean;
  isStopping:   boolean;
  onSetSpeed:   (speed: number) => void;
  onStart:      () => void;
  onStop:       () => void;
  onToggleMap:  () => void;
  onClearCache: () => void;
}

const SimDriverCard: React.FC<Props> = ({
  driver, selectedSpeed,
  isStarting, isStopping,
  onSetSpeed, onStart, onStop, onToggleMap, onClearCache,
}) => {
  const { sim }      = driver;
  const isRunning    = !!sim?.isRunning;
  const busy         = isStarting || isStopping;
  const hasRoute     = !!driver.route_id;
  const pct          = sim?.progressPercent ?? 0;

  // Elapsed time estimate based on progress
  const etaLabel = (): string => {
    if (!sim || !isRunning) return '';
    const remaining = 100 - pct;
    if (remaining <= 0) return 'Finishing…';
    const lapSecs = (sim.totalWaypoints * (2000 / sim.speedMultiplier)) / 1000;
    const remSecs = Math.round((remaining / 100) * lapSecs);
    if (remSecs < 60) return `~${remSecs}s left`;
    return `~${Math.floor(remSecs / 60)}m ${remSecs % 60}s left`;
  };

  return (
    <div className={`sdc-card ${isRunning ? 'sdc-running' : ''}`}>
      {/* Top animated strip */}
      {isRunning && <div className="sdc-strip" />}

      {/* ── Header row ── */}
      <div className="sdc-header">
        {/* Avatar */}
        <div className={`sdc-avatar ${isRunning ? 'sdc-avatar-on' : ''}`}>
          {isRunning
            ? <Zap size={18} strokeWidth={2} className="sdc-avatar-icon-on" />
            : <Bus size={18} strokeWidth={2} className="sdc-avatar-icon-off" />
          }
        </div>

        {/* Driver info */}
        <div className="sdc-info">
          <p className="sdc-name">{driver.driver_name}</p>
          <p className="sdc-plate">{driver.plate_number}</p>
          {driver.average_rating > 0 && (
            <div className="sdc-rating">
              <Star size={10} strokeWidth={1.5} className="sdc-star" />
              <span>{driver.average_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Status + running state */}
        <div className="sdc-meta">
          <span className={`sdc-status ${isRunning ? 'sdc-status-on' : 'sdc-status-off'}`}>
            {isRunning ? '● Running' : '○ Stopped'}
          </span>
          {isRunning && sim && (
            <span className="sdc-speed-badge">{sim.speedMultiplier}×</span>
          )}
        </div>
      </div>

      {/* ── Route row ── */}
      {driver.route_name ? (
        <div className="sdc-route-row">
          <span
            className="sdc-route-dot"
            style={{ background: driver.route_colour ?? '#1D9E75' }}
          />
          <Navigation size={11} strokeWidth={2.5} className="sdc-nav-icon" />
          <span className="sdc-route-name">{driver.route_name}</span>
          {driver.city_name && <span className="sdc-city">{driver.city_name}</span>}
        </div>
      ) : (
        <div className="sdc-no-route">
          <AlertCircle size={12} strokeWidth={2.5} />
          No route assigned — cannot run simulation
        </div>
      )}

      {/* ── Progress section (when running) ── */}
      {isRunning && sim && (
        <div className="sdc-progress-section">
          {/* Progress bar */}
          <div className="sdc-progress-track">
            <div className="sdc-progress-fill" style={{ width: `${pct}%` }} />
          </div>

          {/* Progress detail row */}
          <div className="sdc-progress-detail">
            <span className="sdc-progress-pct">{pct}% complete</span>
            <span className="sdc-progress-wpt">
              {formatProgress(sim.currentIndex, sim.totalWaypoints)} waypoints
            </span>
            <span className="sdc-progress-eta">{etaLabel()}</span>
          </div>

          {/* Position */}
          {sim.currentPosition && (
            <div className="sdc-position">
              <span className="sdc-position-label">Position</span>
              <span className="sdc-position-val">
                {sim.currentPosition.lat.toFixed(5)},&nbsp;
                {sim.currentPosition.lng.toFixed(5)}
              </span>
            </div>
          )}

          {/* Onboard count summary */}
          <div className="sdc-onboard-summary">
            <span className="sdc-onboard-count">
              {driver.onboard.length} passenger{driver.onboard.length !== 1 ? 's' : ''} on board
            </span>
            {sim.passengerCount > 0 && (
              <span className="sdc-random-pax">
                + {sim.passengerCount} random
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Onboard passenger list ── */}
      <OnboardList passengers={driver.onboard} isRunning={isRunning} />

      {/* ── Map preview toggle ── */}
      {hasRoute && (
        <div className="sdc-map-section">
          <button
            onClick={onToggleMap}
            className="sdc-map-toggle"
          >
            <MapIcon size={13} strokeWidth={2.5} />
            {driver.mapExpanded ? 'Hide route map' : 'View route map'}
            {driver.mapExpanded
              ? <ChevronUp size={13} strokeWidth={2.5} />
              : <ChevronDown size={13} strokeWidth={2.5} />
            }
          </button>

          {driver.mapExpanded && (
            <RoutePreviewMap
              waypoints={driver.waypoints}
              stops={driver.stops}
              sim={driver.sim}
              routeColour={driver.route_colour}
              driverId={driver.user_id}
            />
          )}
        </div>
      )}

      {/* ── Controls ── */}
      <div className="sdc-controls">
        {!isRunning && hasRoute && (
          <div className="sdc-speed-section">
            <p className="sdc-speed-label">Simulation speed</p>
            <div className="sdc-speed-grid">
              {SPEED_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onSetSpeed(opt.value)}
                  className={`sdc-speed-btn ${selectedSpeed === opt.value ? 'sdc-speed-active' : ''}`}
                >
                  <span className="sdc-speed-val">{opt.label}</span>
                  <span className="sdc-speed-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main action */}
        <div className="sdc-action-row">
          {isRunning ? (
            <button
              onClick={onStop}
              disabled={busy}
              className="sdc-btn sdc-btn-stop"
            >
              {isStopping
                ? <><div className="sdc-spinner" />Stopping…</>
                : <><Square size={15} strokeWidth={2.5} />Stop Simulation</>
              }
            </button>
          ) : (
            <button
              onClick={onStart}
              disabled={busy || !hasRoute}
              className="sdc-btn sdc-btn-start"
            >
              {isStarting
                ? <><div className="sdc-spinner" />Starting…</>
                : <><Play size={15} strokeWidth={2.5} />Start at {selectedSpeed}×</>
              }
            </button>
          )}

          {/* Cache clear for this route */}
          {hasRoute && (
            <button
              onClick={onClearCache}
              className="sdc-btn-ghost"
              title="Clear OSRM path cache for this route"
            >
              <RefreshCw size={13} strokeWidth={2.5} />
              Clear cache
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimDriverCard;