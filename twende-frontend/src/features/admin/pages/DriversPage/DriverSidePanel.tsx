// src/features/admin/pages/DriversPage/DriverSidePanel.tsx
import React, { useEffect, useState } from 'react';
import {
  X, Star, Bus, MapPin, Users, Zap, ZapOff,
  Play, Square, ChevronDown, UserCheck, UserX,
  Route, Car, Palette, Calendar, Shield,
} from 'lucide-react';
import type { DriverRow, RouteOption, OnboardPassenger } from './types';

const SPEEDS = [10, 15, 20, 25, 30];

const AMENITY_LABELS: Record<string, string> = {
  wifi:          '📶 WiFi',
  ac:            '❄️ A/C',
  usb:           '🔌 USB Ports',
  music:         '🎵 Music',
  tv:            '📺 TV',
  cctv:          '📷 CCTV',
  leather_seats: '💺 Leather Seats',
};

interface Props {
  driver:             DriverRow;
  routes:             RouteOption[];
  onClose:            () => void;
  onToggleActive:     (id: number, current: boolean) => void;
  onUpdateRoute:      (id: number, routeId: number) => void;
  onStartSim:         (id: number) => void;
  onStopSim:          (id: number) => void;
  startingId:         number | null;
  stoppingId:         number | null;
  selectedSpeed:      Record<number, number>;
  onSetSpeed:         (id: number, speed: number) => void;
  onboardPassengers:  OnboardPassenger[];
  onboardLoading:     number | null;
  onFetchOnboard:     (id: number) => void;
}

const DriverSidePanel: React.FC<Props> = ({
  driver, routes, onClose, onToggleActive, onUpdateRoute,
  onStartSim, onStopSim, startingId, stoppingId,
  selectedSpeed, onSetSpeed, onboardPassengers, onboardLoading, onFetchOnboard,
}) => {
  const [routeDropdown, setRouteDropdown] = useState(false);
  const speed      = selectedSpeed[driver.user_id] ?? 20;
  const isStarting = startingId === driver.user_id;
  const isStopping = stoppingId === driver.user_id;

  useEffect(() => {
    if (driver.simulation_running) {
      onFetchOnboard(driver.user_id);
    }
  }, [driver.user_id, driver.simulation_running, onFetchOnboard]);

  return (
    <div className="drvr-panel-overlay" onClick={onClose}>
      <aside className="drvr-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="drvr-panel-header">
          <div className="drvr-panel-brand">
            <div className={`drvr-panel-avatar${driver.simulation_running ? ' drvr-panel-avatar-live' : ''}`}>
              <Bus size={20} strokeWidth={2} />
              {driver.simulation_running && <span className="drvr-panel-avatar-ring" />}
            </div>
            <div>
              <p className="drvr-panel-name">{driver.name}</p>
              <p className="drvr-panel-email">{driver.email}</p>
            </div>
          </div>
          <button className="drvr-panel-close" onClick={onClose} aria-label="Close panel">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="drvr-panel-body">

          {/* Status + quick actions */}
          <div className="drvr-panel-status-row">
            <span className={`drvr-status-chip ${driver.is_active ? 'drvr-chip-on' : 'drvr-chip-off'}`}>
              {driver.is_active
                ? <><Zap size={9} /> Online</>
                : <><ZapOff size={9} /> Offline</>
              }
            </span>
            {driver.simulation_running && (
              <span className="drvr-chip-live">
                <span className="drvr-live-dot" /> LIVE SIM
              </span>
            )}
            <button
              className={`drvr-toggle-btn ${driver.is_active ? 'drvr-toggle-deactivate' : 'drvr-toggle-activate'}`}
              onClick={() => onToggleActive(driver.user_id, driver.is_active)}
            >
              {driver.is_active
                ? <><UserX size={11} /> Deactivate</>
                : <><UserCheck size={11} /> Activate</>
              }
            </button>
          </div>

          {/* Stats row */}
          <div className="drvr-panel-stats">
            <div className="drvr-panel-stat">
              <Star size={14} className="drvr-pstat-icon yellow" />
              <span className="drvr-pstat-val">{driver.average_rating.toFixed(1)}</span>
              <span className="drvr-pstat-label">Rating</span>
            </div>
            <div className="drvr-panel-stat">
              <Route size={14} className="drvr-pstat-icon blue" />
              <span className="drvr-pstat-val">{driver.total_trips}</span>
              <span className="drvr-pstat-label">Trips</span>
            </div>
            <div className="drvr-panel-stat">
              <Users size={14} className="drvr-pstat-icon green" />
              <span className="drvr-pstat-val">{driver.capacity}</span>
              <span className="drvr-pstat-label">Capacity</span>
            </div>
          </div>

          {/* Vehicle details */}
          <div className="drvr-panel-section">
            <p className="drvr-panel-section-label">Vehicle Details</p>
            <div className="drvr-detail-grid">
              <div className="drvr-detail-item">
                <Shield size={12} className="drvr-detail-icon" />
                <span className="drvr-detail-key">Plate</span>
                <span className="drvr-detail-val drvr-plate">{driver.plate_number}</span>
              </div>
              {driver.vehicle_make && (
                <div className="drvr-detail-item">
                  <Car size={12} className="drvr-detail-icon" />
                  <span className="drvr-detail-key">Make</span>
                  <span className="drvr-detail-val">{driver.vehicle_make}</span>
                </div>
              )}
              {driver.vehicle_model && (
                <div className="drvr-detail-item">
                  <Bus size={12} className="drvr-detail-icon" />
                  <span className="drvr-detail-key">Model</span>
                  <span className="drvr-detail-val">{driver.vehicle_model}</span>
                </div>
              )}
              {driver.vehicle_year && (
                <div className="drvr-detail-item">
                  <Calendar size={12} className="drvr-detail-icon" />
                  <span className="drvr-detail-key">Year</span>
                  <span className="drvr-detail-val">{driver.vehicle_year}</span>
                </div>
              )}
              {driver.vehicle_colour && (
                <div className="drvr-detail-item">
                  <Palette size={12} className="drvr-detail-icon" />
                  <span className="drvr-detail-key">Colour</span>
                  <span className="drvr-detail-val">{driver.vehicle_colour}</span>
                </div>
              )}
              {driver.city_name && (
                <div className="drvr-detail-item">
                  <MapPin size={12} className="drvr-detail-icon" />
                  <span className="drvr-detail-key">City</span>
                  <span className="drvr-detail-val">{driver.city_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Amenities */}
          {driver.amenities && driver.amenities.length > 0 && (
            <div className="drvr-panel-section">
              <p className="drvr-panel-section-label">Amenities</p>
              <div className="drvr-amenities">
                {driver.amenities.map((a) => (
                  <span key={a} className="drvr-amenity-chip">
                    {AMENITY_LABELS[a] ?? a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Route assignment */}
          <div className="drvr-panel-section">
            <p className="drvr-panel-section-label">Route Assignment</p>
            <div className="drvr-route-current">
              {driver.route_name ? (
                <>
                  {/* DB-driven hex colour — inline style is the only way, same as
                      dashboard sim-route-dot convention documented in adminDashboard.css */}
                  <span
                    className="drvr-route-dot"
                    style={{ background: driver.route_colour ?? '#888' }}
                  />
                  <span className="drvr-route-label">{driver.route_name}</span>
                </>
              ) : (
                <span className="drvr-no-route">No route assigned</span>
              )}
            </div>
            <div className="drvr-route-dropdown-wrap">
              <button
                className="drvr-route-dropdown-btn"
                onClick={() => setRouteDropdown((v) => !v)}
                aria-expanded={routeDropdown}
                aria-label="Change route assignment"
              >
                <Route size={12} />
                <span>Change route</span>
                <ChevronDown size={12} className={routeDropdown ? 'rotated' : ''} />
              </button>
              {routeDropdown && (
                <div className="drvr-route-dropdown">
                  {routes.map((r) => (
                    <button
                      key={r.id}
                      className={`drvr-route-option${driver.route_id === r.id ? ' drvr-route-option-active' : ''}`}
                      onClick={() => {
                        onUpdateRoute(driver.user_id, r.id);
                        setRouteDropdown(false);
                      }}
                    >
                      {/* DB-driven hex — permitted inline style exception */}
                      <span
                        className="drvr-route-dot"
                        style={{ background: r.colour }}
                      />
                      <span>{r.name}</span>
                      <span className="drvr-route-city">{r.city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Simulation controls */}
          <div className="drvr-panel-section">
            <p className="drvr-panel-section-label">Simulation</p>

            {!driver.route_id && (
              <p className="drvr-sim-no-route">⚠️ Assign a route first to run simulation</p>
            )}

            <div className="drvr-speed-row">
              <span className="drvr-speed-label">Speed</span>
              <div className="drvr-speed-chips">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    className={`drvr-speed-chip${speed === s ? ' drvr-speed-active' : ''}`}
                    onClick={() => onSetSpeed(driver.user_id, s)}
                    aria-pressed={speed === s}
                    aria-label={`Set speed to ${s}x`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {driver.simulation_running ? (
              <button
                className="drvr-sim-btn drvr-sim-stop"
                disabled={isStopping}
                onClick={() => onStopSim(driver.user_id)}
              >
                {isStopping
                  ? <><span className="drvr-spinner" /> Stopping…</>
                  : <><Square size={13} fill="currentColor" /> Stop Simulation</>
                }
              </button>
            ) : (
              <button
                className="drvr-sim-btn drvr-sim-start"
                disabled={isStarting || !driver.route_id}
                onClick={() => onStartSim(driver.user_id)}
              >
                {isStarting
                  ? <><span className="drvr-spinner" /> Starting…</>
                  : <><Play size={13} fill="currentColor" /> Start Simulation</>
                }
              </button>
            )}
          </div>

          {/* Onboard passengers */}
          {driver.simulation_running && (
            <div className="drvr-panel-section">
              <p className="drvr-panel-section-label">
                Onboard Passengers
                <button
                  className="drvr-refresh-onboard"
                  onClick={() => onFetchOnboard(driver.user_id)}
                  aria-label="Refresh onboard passengers"
                >
                  ↻
                </button>
              </p>
              {onboardLoading === driver.user_id ? (
                <div className="drvr-onboard-loading">
                  <span className="drvr-spinner dark" /> Loading…
                </div>
              ) : onboardPassengers.length === 0 ? (
                <p className="drvr-onboard-empty">No passengers on board</p>
              ) : (
                <div className="drvr-onboard-list">
                  {onboardPassengers.map((p, i) => (
                    <div key={i} className="drvr-onboard-row">
                      <div className="drvr-onboard-avatar">
                        {p.passenger_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="drvr-onboard-info">
                        <span className="drvr-onboard-name">{p.passenger_name}</span>
                        <span className="drvr-onboard-dest">→ {p.destination}</span>
                      </div>
                      <span className={`drvr-pay-chip ${p.payment_status === 'paid' ? 'drvr-pay-paid' : 'drvr-pay-cash'}`}>
                        {p.payment_status === 'paid' ? 'Paid' : 'Cash'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </aside>
    </div>
  );
};

export default DriverSidePanel;