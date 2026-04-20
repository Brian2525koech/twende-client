// src/features/admin/pages/DashboardPage/SimulationPanel.tsx
import React from 'react';
import { Play, Square, Bus, Users, Navigation, Star } from 'lucide-react';
import type { SimDriver } from './types';

const SPEEDS = [10, 15, 20, 25, 30] as const;

interface Props {
  drivers:      SimDriver[];
  startingId:   number | null;
  stoppingId:   number | null;
  selectedSpeed: Record<number, number>;
  onSetSpeed:   (driverId: number, speed: number) => void;
  onStart:      (driverId: number) => void;
  onStop:       (driverId: number) => void;
  onStopAll:    () => void;
  onClearCache: () => void;
}

const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div className="sim-progress-track">
    <div className="sim-progress-fill" style={{ width: `${Math.min(100, pct)}%` }} />
    <span className="sim-progress-label">{pct}%</span>
  </div>
);

const SimulationPanel: React.FC<Props> = ({
  drivers, startingId, stoppingId,
  selectedSpeed, onSetSpeed, onStart, onStop, onStopAll, onClearCache,
}) => {
  const runningCount = drivers.filter(d => d.simulation_running).length;

  return (
    <div className="sim-panel">
      {/* Panel header */}
      <div className="sim-panel-header">
        <div>
          <p className="adm-section-label">Simulation Control</p>
          <p className="sim-panel-running">
            {runningCount > 0
              ? <><span className="sim-running-dot" />{runningCount} simulation{runningCount > 1 ? 's' : ''} running</>
              : 'No simulations running'
            }
          </p>
        </div>
        <div className="sim-panel-actions">
          <button onClick={onClearCache} className="sim-action-btn sim-btn-cache">
            ↺ Clear Cache
          </button>
          {runningCount > 0 && (
            <button onClick={onStopAll} className="sim-action-btn sim-btn-stop-all">
              ■ Stop All
            </button>
          )}
        </div>
      </div>

      {/* Driver cards */}
      <div className="sim-driver-grid">
        {drivers.map(driver => {
          const isStarting = startingId === driver.user_id;
          const isStopping = stoppingId === driver.user_id;
          const busy       = isStarting || isStopping;
          const speed      = selectedSpeed[driver.user_id] ?? 20;

          return (
            <div
              key={driver.user_id}
              className={`sim-driver-card ${driver.simulation_running ? 'sim-card-running' : ''}`}
            >
              {/* Running indicator strip */}
              {driver.simulation_running && <div className="sim-card-strip" />}

              {/* Driver info row */}
              <div className="sim-driver-top">
                <div className={`sim-driver-avatar ${driver.simulation_running ? 'sim-avatar-running' : ''}`}>
                  <Bus size={16} strokeWidth={2} />
                </div>
                <div className="sim-driver-info">
                  <p className="sim-driver-name">{driver.driver_name}</p>
                  <p className="sim-driver-plate">{driver.plate_number}</p>
                </div>
                <div className="sim-driver-meta">
                  {driver.average_rating > 0 && (
                    <div className="sim-rating">
                      <Star size={10} strokeWidth={1.5} className="sim-star" />
                      <span>{driver.average_rating.toFixed(1)}</span>
                    </div>
                  )}
                  <span className={`sim-status-chip ${driver.simulation_running ? 'sim-chip-on' : 'sim-chip-off'}`}>
                    {driver.simulation_running ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>

              {/* Route info */}
              {driver.route_name && (
                <div className="sim-route-row">
                  <div
                    className="sim-route-dot"
                    style={{ background: driver.route_colour ?? '#1D9E75' }}
                  />
                  <Navigation size={10} strokeWidth={2.5} className="sim-route-icon" />
                  <span className="sim-route-name">{driver.route_name}</span>
                  {driver.city_name && (
                    <span className="sim-city">{driver.city_name}</span>
                  )}
                </div>
              )}

              {/* Progress bar (when running) */}
              {driver.simulation_running && (
                <>
                  <ProgressBar pct={driver.progress_percent} />
                  <p className="sim-waypoint-label">
                    Waypoint {driver.current_index.toLocaleString()} / {driver.total_waypoints.toLocaleString()} · {driver.speed_multiplier}x speed
                  </p>
                </>
              )}

              {/* Onboard passengers (when running) */}
              {driver.simulation_running && driver.onboard_count > 0 && (
                <div className="sim-onboard">
                  <div className="sim-onboard-header">
                    <Users size={11} strokeWidth={2.5} className="sim-onboard-icon" />
                    <span>{driver.onboard_count} on board</span>
                  </div>
                  {driver.onboard_passengers.slice(0, 3).map((p, i) => (
                    <div key={i} className="sim-onboard-row">
                      <div className="sim-onboard-avatar">
                        {(p.passengerName || 'P')[0].toUpperCase()}
                      </div>
                      <div className="sim-onboard-info">
                        <span className="sim-onboard-name">{p.passengerName}</span>
                        {p.destinationStopName && (
                          <span className="sim-onboard-dest">→ {p.destinationStopName}</span>
                        )}
                      </div>
                      <span className={`sim-pay-chip ${p.paidViaMpesa ? 'sim-pay-paid' : 'sim-pay-cash'}`}>
                        {p.payment_display}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="sim-controls">
                {/* Speed selector — only when not running */}
                {!driver.simulation_running && (
                  <div className="sim-speed-row">
                    <span className="sim-speed-label">Speed</span>
                    <div className="sim-speed-chips">
                      {SPEEDS.map(s => (
                        <button
                          key={s}
                          onClick={() => onSetSpeed(driver.user_id, s)}
                          className={`sim-speed-chip ${speed === s ? 'sim-speed-active' : ''}`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Start / Stop button */}
                {driver.simulation_running ? (
                  <button
                    onClick={() => onStop(driver.user_id)}
                    disabled={busy}
                    className="sim-btn sim-btn-stop"
                  >
                    {isStopping ? <div className="sim-spinner" /> : <Square size={14} strokeWidth={2.5} />}
                    Stop Simulation
                  </button>
                ) : (
                  <button
                    onClick={() => onStart(driver.user_id)}
                    disabled={busy || !driver.route_id}
                    className="sim-btn sim-btn-start"
                    title={!driver.route_id ? 'No route assigned to this driver' : ''}
                  >
                    {isStarting ? <div className="sim-spinner" /> : <Play size={14} strokeWidth={2.5} />}
                    Start at {speed}x
                  </button>
                )}
              </div>

              {/* No route warning */}
              {!driver.route_id && (
                <p className="sim-no-route">⚠ No route assigned — cannot simulate</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimulationPanel;