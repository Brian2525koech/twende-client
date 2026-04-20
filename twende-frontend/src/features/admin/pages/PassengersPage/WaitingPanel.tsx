// src/features/admin/pages/PassengersPage/WaitingPanel.tsx
import React from 'react';
import { Clock, MapPin, ArrowRight, User, CheckCircle2, Loader2 } from 'lucide-react';
import type { WaitingPassenger } from './types';
import { waitingDuration, timeAgo } from './types';

interface Props {
  waiting: WaitingPassenger[];
  loading: boolean;
}

const STATUS_LABELS: Record<WaitingPassenger['status'], string> = {
  waiting:   'Waiting',
  accepted:  'Accepted',
  boarded:   'Boarded',
  cancelled: 'Cancelled',
  expired:   'Expired',
};

const WaitingPanel: React.FC<Props> = ({ waiting, loading }) => {
  const active = waiting.filter(
    (w) => w.status === 'waiting' || w.status === 'accepted' || w.status === 'boarded',
  );

  return (
    <div className="pass-waiting-panel">
      {/* Header */}
      <div className="pass-waiting-header">
        <div className="pass-waiting-title-row">
          <span className="pass-live-dot" />
          <span className="pass-waiting-title">Live Waiting Queue</span>
          {loading && <Loader2 size={12} className="pass-spin" />}
        </div>
        <span className="pass-waiting-count">{active.length} active</span>
      </div>

      {/* List */}
      {active.length === 0 ? (
        <div className="pass-empty">
          <User size={28} strokeWidth={1.3} className="pass-empty-icon" />
          <p className="pass-empty-title">No passengers waiting</p>
          <p className="pass-empty-sub">Queue is clear right now</p>
        </div>
      ) : (
        <div className="pass-waiting-list">
          {active.map((w) => (
            <div key={w.id} className="pass-waiting-row">
              {/* Left: avatar */}
              <div className={`pass-waiting-avatar pass-avatar-${w.status}`}>
                {w.passenger_name.charAt(0).toUpperCase()}
              </div>

              {/* Middle: info */}
              <div className="pass-waiting-info">
                <p className="pass-waiting-name">{w.passenger_name}</p>

                {/* Route dot + name */}
                <div className="pass-waiting-route-row">
                  <span
                    className="pass-route-dot"
                    style={{ ['--dot-color' as string]: w.route_colour } as React.CSSProperties}
                  />
                  <span className="pass-waiting-route">{w.route_name}</span>
                </div>

                {/* Stop → Destination */}
                <div className="pass-stop-row">
                  <MapPin size={9} className="pass-stop-icon" strokeWidth={2.5} />
                  <span className="pass-stop-name">{w.stop_name}</span>
                  {w.destination_stop_name && (
                    <>
                      <ArrowRight size={9} className="pass-arrow-icon" strokeWidth={2.5} />
                      <span className="pass-dest-name">{w.destination_stop_name}</span>
                    </>
                  )}
                </div>

                {/* Driver if accepted */}
                {w.accepted_by_driver_name && (
                  <div className="pass-driver-row">
                    <CheckCircle2 size={9} strokeWidth={2.5} className="pass-check-icon" />
                    <span className="pass-driver-name">
                      Accepted by {w.accepted_by_driver_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: status + timing */}
              <div className="pass-waiting-right">
                <span className={`pass-status-chip pass-chip-${w.status}`}>
                  {STATUS_LABELS[w.status]}
                </span>
                <div className="pass-timing">
                  <Clock size={9} strokeWidth={2.5} />
                  <span>{waitingDuration(w.created_at)}</span>
                </div>
                <span className="pass-ago">{timeAgo(w.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WaitingPanel;