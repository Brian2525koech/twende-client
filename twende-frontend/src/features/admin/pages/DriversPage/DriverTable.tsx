// src/features/admin/pages/DriversPage/DriverTable.tsx
import React from 'react';
import { Star, Bus, MapPin, Zap, ZapOff, ChevronRight } from 'lucide-react';
import type { DriverRow } from './types';

interface Props {
  drivers:  DriverRow[];
  onSelect: (d: DriverRow) => void;
}

const DriverTable: React.FC<Props> = ({ drivers, onSelect }) => {
  if (drivers.length === 0) {
    return (
      <div className="drvr-empty">
        <Bus size={32} strokeWidth={1.2} className="drvr-empty-icon" />
        <p className="drvr-empty-title">No drivers found</p>
        <p className="drvr-empty-sub">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="drvr-table-wrap">
      {drivers.map((d) => (
        <button
          key={d.user_id}
          className={`drvr-row${d.simulation_running ? ' drvr-row-live' : ''}`}
          onClick={() => onSelect(d)}
        >
          {/* Running strip */}
          {d.simulation_running && <span className="drvr-row-strip" />}

          {/* Avatar */}
          <div className={`drvr-avatar${d.simulation_running ? ' drvr-avatar-live' : ''}`}>
            <Bus size={16} strokeWidth={2.2} />
          </div>

          {/* Main info */}
          <div className="drvr-row-info">
            <div className="drvr-row-top">
              <span className="drvr-row-name">{d.name}</span>
              {d.simulation_running && (
                <span className="drvr-chip-live">
                  <span className="drvr-live-dot" />
                  LIVE
                </span>
              )}
            </div>
            <span className="drvr-row-email">{d.email}</span>
            <div className="drvr-row-meta">
              <span className="drvr-plate">{d.plate_number}</span>
              {d.route_name && (
                <>
                  <span className="drvr-meta-sep">·</span>
                  {/* dynamic colour must stay as inline style — it is a DB hex value,
                      not a design token. This is the only permitted exception per the
                      dashboard convention (same pattern as sim-route-dot). */}
                  <span
                    className="drvr-route-dot"
                    style={{ background: d.route_colour ?? '#888' }}
                  />
                  <span className="drvr-route-label">{d.route_name}</span>
                </>
              )}
              {d.city_name && (
                <>
                  <span className="drvr-meta-sep">·</span>
                  <MapPin size={9} className="drvr-city-icon" />
                  <span className="drvr-city-label">{d.city_name}</span>
                </>
              )}
            </div>
          </div>

          {/* Right stats */}
          <div className="drvr-row-right">
            <div className="drvr-rating">
              <Star size={10} strokeWidth={0} className="drvr-star" />
              <span>{d.average_rating.toFixed(1)}</span>
            </div>
            <span className={`drvr-status-chip ${d.is_active ? 'drvr-chip-on' : 'drvr-chip-off'}`}>
              {d.is_active
                ? <><Zap size={8} strokeWidth={2.5} /> Online</>
                : <><ZapOff size={8} strokeWidth={2.5} /> Offline</>
              }
            </span>
            <span className="drvr-trips-count">{d.total_trips} trips</span>
          </div>

          <ChevronRight size={14} className="drvr-row-chevron" />
        </button>
      ))}
    </div>
  );
};

export default DriverTable;