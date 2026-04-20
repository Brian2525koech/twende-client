// src/features/driver/pages/TripsPage/TripCard.tsx
import React, { useState } from 'react';
import {
  ArrowRight, Clock, Users, Banknote,
  ChevronDown, ChevronUp, Bus,
} from 'lucide-react';
import type { DriverTrip } from './types';
import { paymentInfo } from './types';

interface Props {
  trip:      DriverTrip;
  animIndex: number;
}

const TripCard: React.FC<Props> = ({ trip, animIndex }) => {
  const [expanded, setExpanded] = useState(false);
  const pay = paymentInfo(trip.payment_status);

  return (
    <div
      className={`tc-card ${trip.status === 'ongoing' ? 'tc-card-ongoing' : ''}`}
      style={{ animationDelay: `${animIndex * 40}ms` }}
    >
      {/* Status strip */}
      <div className={`tc-strip tc-strip-${trip.status}`} />

      <div className="tc-body">
        {/* Main row */}
        <div className="tc-main-row">
          {/* Bus icon */}
          <div className={`tc-bus-icon ${trip.status === 'ongoing' ? 'tc-bus-ongoing' : ''}`}>
            <Bus size={16} strokeWidth={2} className="tc-bus-svg" />
          </div>

          {/* Route from→to */}
          <div className="tc-route-info">
            <div className="tc-route-line">
              {trip.route_colour && (
                <span
                  className="tc-route-dot"
                  style={{ background: trip.route_colour }}
                />
              )}
              <span className="tc-route-name">{trip.route_name}</span>
            </div>
            <div className="tc-stops-line">
              <span className="tc-stop">{trip.from_stop}</span>
              <ArrowRight size={11} strokeWidth={2.5} className="tc-arrow" />
              <span className="tc-stop">{trip.to_stop}</span>
            </div>
            <p className="tc-time">{trip.time}</p>
          </div>

          {/* Right: fare + status */}
          <div className="tc-right">
            <p className="tc-fare">KSh {Number(trip.fare).toLocaleString()}</p>
            <span className={`tc-status-badge tc-status-${trip.status}`}>
              {trip.status}
            </span>
          </div>
        </div>

        {/* Chips row */}
        <div className="tc-chips-row">
          <div className="tc-chip">
            <Users size={11} strokeWidth={2.5} />
            <span>{trip.passenger_count} pax</span>
          </div>
          {trip.duration && (
            <div className="tc-chip">
              <Clock size={11} strokeWidth={2.5} />
              <span>{trip.duration}</span>
            </div>
          )}
          <span className={`tc-pay-pill ${pay.cls}`}>{pay.label}</span>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="tc-expand-btn"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded
              ? <ChevronUp size={14} strokeWidth={2.5} />
              : <ChevronDown size={14} strokeWidth={2.5} />
            }
          </button>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="tc-detail">
            <div className="tc-detail-row">
              <span className="tc-detail-label">Passenger</span>
              <span className="tc-detail-value">{trip.passenger_name}</span>
            </div>
            {trip.matatu_number && (
              <div className="tc-detail-row">
                <span className="tc-detail-label">Matatu</span>
                <span className="tc-detail-value">{trip.matatu_number}</span>
              </div>
            )}
            {trip.payment_method && (
              <div className="tc-detail-row">
                <span className="tc-detail-label">Payment</span>
                <span className="tc-detail-value tc-detail-cap">{trip.payment_method}</span>
              </div>
            )}
            {trip.started_at && (
              <div className="tc-detail-row">
                <span className="tc-detail-label">Started</span>
                <span className="tc-detail-value">
                  {new Date(trip.started_at).toLocaleTimeString('en-KE', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {trip.ended_at && (
              <div className="tc-detail-row">
                <span className="tc-detail-label">Ended</span>
                <span className="tc-detail-value">
                  {new Date(trip.ended_at).toLocaleTimeString('en-KE', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TripCard;