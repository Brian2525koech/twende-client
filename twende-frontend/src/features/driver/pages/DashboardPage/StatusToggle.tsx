// src/features/driver/pages/DashboardPage/StatusToggle.tsx
import React, { useState } from 'react';
import { Navigation, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import type { DriverProfile } from './types';

interface Props {
  profile:        DriverProfile;
  toggling:       boolean;
  socketConnected: boolean;
  onToggle:       (next: boolean) => Promise<void>;
}

const StatusToggle: React.FC<Props> = ({ profile, toggling, socketConnected, onToggle }) => {
  // Going offline requires a second tap (safety guard for drivers)
  const [confirmOff, setConfirmOff] = useState(false);

  const handlePress = async () => {
    if (profile.is_active) {
      // First tap while online → show confirm
      if (!confirmOff) {
        setConfirmOff(true);
        setTimeout(() => setConfirmOff(false), 3000);
        return;
      }
      // Second tap → actually go offline
      setConfirmOff(false);
      await onToggle(false);
    } else {
      await onToggle(true);
    }
  };

  const isOnline = profile.is_active;

  return (
    <div className={`dst-card ${isOnline ? 'dst-online' : 'dst-offline'}`}>
      {/* Dot-grid texture overlay */}
      <div className="dst-texture" />

      <div className="dst-content">
        {/* Left: indicator + info */}
        <div className="dst-left">
          <div className={`dst-indicator ${isOnline ? 'dst-ind-on' : 'dst-ind-off'}`}>
            <div className={`dst-dot ${isOnline ? 'dst-dot-on' : 'dst-dot-off'}`} />
          </div>
          <div className="dst-info">
            <p className="dst-status-label">
              {isOnline ? "You're Online" : "You're Offline"}
            </p>
            <p className="dst-status-sub">
              {isOnline
                ? `${profile.route_name ?? 'Route'} · Accepting passengers`
                : 'Tap to go online and start your shift'
              }
            </p>
          </div>
        </div>

        {/* Right: button */}
        <button
          onClick={handlePress}
          disabled={toggling}
          className={`dst-btn ${
            toggling        ? 'dst-btn-loading' :
            confirmOff      ? 'dst-btn-confirm' :
            isOnline        ? 'dst-btn-go-off'  : 'dst-btn-go-on'
          }`}
        >
          {toggling ? (
            <div className="dst-spinner" />
          ) : confirmOff ? (
            <>
              <AlertTriangle size={14} strokeWidth={2.5} />
              Confirm?
            </>
          ) : isOnline ? (
            'Go Offline'
          ) : (
            'Go Online'
          )}
        </button>
      </div>

      {/* Bottom strip: plate + route + socket status */}
      <div className="dst-strip">
        <span className="dst-plate">{profile.plate_number}</span>
        {profile.route_name && (
          <span className="dst-route">
            <Navigation size={10} strokeWidth={2.5} />
            {profile.route_name}
          </span>
        )}
        {profile.city_name && (
          <span className="dst-city">{profile.city_name}</span>
        )}
        <div className={`dst-socket-badge ${socketConnected ? 'dst-socket-on' : 'dst-socket-off'}`}>
          {socketConnected
            ? <><Wifi size={10} strokeWidth={2.5} />Live</>
            : <><WifiOff size={10} strokeWidth={2.5} />Offline</>
          }
        </div>
      </div>
    </div>
  );
};

export default StatusToggle;