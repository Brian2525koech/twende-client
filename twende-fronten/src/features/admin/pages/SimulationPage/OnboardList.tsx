// src/features/admin/pages/SimulationPage/OnboardList.tsx
import React from 'react';
import { Users, MapPin, ArrowRight, CreditCard } from 'lucide-react';
import type { OnboardPassenger } from './types';

interface Props {
  passengers: OnboardPassenger[];
  isRunning:  boolean;
}

const OnboardList: React.FC<Props> = ({ passengers, isRunning }) => {
  if (!isRunning) return null;

  return (
    <div className="sim-onboard-section">
      <div className="sim-onboard-header">
        <Users size={13} strokeWidth={2.5} className="sim-onboard-icon-u" />
        <span className="sim-onboard-title">
          On Board — {passengers.length} passenger{passengers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {passengers.length === 0 ? (
        <p className="sim-onboard-empty">No passengers currently on board</p>
      ) : (
        <div className="sim-onboard-list">
          {passengers.map((p, i) => (
            <div key={p.tripId ?? i} className="sim-pax-row">
              {/* Avatar */}
              <div className="sim-pax-avatar">
                {(p.passengerName || 'P')[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="sim-pax-info">
                <p className="sim-pax-name">{p.passengerName}</p>
                <div className="sim-pax-route">
                  <MapPin size={10} strokeWidth={2.5} className="sim-pax-pin" />
                  <span>{p.boardedAtStop}</span>
                  {p.destinationStopName && (
                    <>
                      <ArrowRight size={9} strokeWidth={2.5} className="sim-pax-arrow" />
                      <span>{p.destinationStopName}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Payment */}
              <div className="sim-pax-right">
                <span className={`sim-pax-pay ${p.paidViaMpesa ? 'pax-pay-paid' : 'pax-pay-cash'}`}>
                  <CreditCard size={9} strokeWidth={2.5} />
                  {p.payment_display}
                </span>
                <span className="sim-pax-tripid">Trip #{p.tripId}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OnboardList;