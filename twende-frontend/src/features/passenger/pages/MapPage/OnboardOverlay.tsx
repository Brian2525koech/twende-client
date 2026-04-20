// src/features/passenger/pages/MapPage/OnboardOverlay.tsx
//
// Floating overlay (bottom of screen, above bottom sheet) that appears once
// the simulator has picked up the passenger. Shows:
//   • Trip progress (from → to)
//   • Fare + payment status
//   • Driver info
//   • "Arriving soon" state when close to destination

import React from 'react';
import {
  Bus, MapPin, Navigation, Star,
  CreditCard, CheckCircle2, Clock, ArrowRight,
} from 'lucide-react';
import type { OnboardTrip } from './types';
import { toNum } from './types';

interface Props {
  trip:           OnboardTrip;
  arrivingSoon:   boolean;
  destinationName?: string;
}

const OnboardOverlay: React.FC<Props> = ({ trip, arrivingSoon, destinationName }) => {
  const isPaid    = trip.payment_status === 'paid';
  const isPending = trip.payment_status === 'cash_pending';

  return (
    <div className={`onboard-overlay ${arrivingSoon ? 'onboard-overlay-arriving' : ''}`}>

      {/* ── Arriving soon banner ── */}
      {arrivingSoon && (
        <div className="onboard-arriving-banner">
          <span className="onboard-arriving-dot" />
          <span>Approaching {destinationName ?? trip.to_stop} — prepare to alight</span>
        </div>
      )}

      {/* ── Main card ── */}
      <div className="onboard-card">

        {/* Header row */}
        <div className="onboard-header">
          <div className="onboard-avatar">
            <Bus size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="onboard-titles">
            <p className="onboard-driver">{trip.driver.name}</p>
            <p className="onboard-plate">{trip.driver.plate_number}</p>
          </div>
          {toNum(trip.driver.average_rating) > 0 && (
            <div className="onboard-rating">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span>{trip.driver.average_rating.toFixed(1)}</span>
            </div>
          )}
          <div className={`onboard-status-chip ${trip.driver.live ? 'onboard-live' : 'onboard-offline'}`}>
            {trip.driver.live ? (
              <><span className="onboard-live-dot" />Live</>
            ) : (
              'Last known'
            )}
          </div>
        </div>

        {/* Route strip */}
        <div className="onboard-route">
          <div className="onboard-route-stop">
            <MapPin size={11} className="onboard-stop-pin" />
            <span>{trip.from_stop}</span>
          </div>
          <ArrowRight size={12} className="onboard-route-arrow" />
          <div className="onboard-route-stop onboard-route-stop-dest">
            <Navigation size={11} className="onboard-dest-pin" />
            <span>{trip.to_stop}</span>
          </div>
        </div>

        {/* Fare row */}
        <div className="onboard-fare-row">
          <div className="onboard-fare-block">
            <span className="onboard-fare-label">Fare</span>
            <span className="onboard-fare-val">KSh {trip.fare.toFixed(0)}</span>
          </div>

          <div className="onboard-payment-status">
            {isPaid ? (
              <div className="onboard-pay-chip onboard-pay-paid">
                <CheckCircle2 size={12} strokeWidth={2.5} />
                <span>Paid</span>
              </div>
            ) : isPending ? (
              <div className="onboard-pay-chip onboard-pay-pending">
                <Clock size={12} strokeWidth={2.5} />
                <span>Pay in cash</span>
              </div>
            ) : (
              <div className="onboard-pay-chip onboard-pay-pending">
                <CreditCard size={12} strokeWidth={2.5} />
                <span>Pending</span>
              </div>
            )}
          </div>

          <div className="onboard-route-name">
            <span>{trip.route_name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardOverlay;