// src/features/admin/pages/TripsPage/TripList.tsx
import React from 'react';
import {
  ArrowRight, User, Bus, MapPin,
  CreditCard, Banknote, Clock,
} from 'lucide-react';
import type { TripGroup, TripRow } from './types';

/* ── helpers ── */
function statusClass(s: TripRow['status']): string {
  if (s === 'completed') return 'trp-pill-completed';
  if (s === 'ongoing')   return 'trp-pill-ongoing';
  return 'trp-pill-cancelled';
}

function payClass(p: TripRow['payment_status']): string {
  if (p === 'paid')         return 'trp-pay-paid';
  if (p === 'cash_pending') return 'trp-pay-cash';
  if (p === 'waived')       return 'trp-pay-waived';
  return 'trp-pay-unpaid';
}

function payLabel(p: TripRow['payment_status']): string {
  if (p === 'paid')         return 'Paid';
  if (p === 'cash_pending') return 'Cash';
  if (p === 'waived')       return 'Waived';
  return 'Unpaid';
}

function methodIcon(m: string | null): React.ReactElement {
  if (!m) return <Banknote size={10} />;
  if (m.toLowerCase().includes('mpesa') || m.toLowerCase().includes('card')) {
    return <CreditCard size={10} />;
  }
  return <Banknote size={10} />;
}

/* ── Route colour dot — DB-driven hex must be an inline style.
   This is the same permitted exception documented in adminDashboard.css
   (sim-route-dot background) and adminDrivers.css (drvr-route-dot). ── */
interface RouteDotProps {
  colour: string | null;
}
const RouteDot: React.FC<RouteDotProps> = ({ colour }) => (
  <span
    className="trp-route-dot"
    style={{ background: colour ?? '#888' }}
  />
);

/* ── Single trip row ── */
const TripRow_: React.FC<{ trip: TripRow }> = ({ trip }) => (
  <div className={`trp-row${trip.status === 'ongoing' ? ' trp-row-live' : ''}`}>
    {trip.status === 'ongoing' && <span className="trp-row-strip" />}

    {/* Top: passenger → driver */}
    <div className="trp-row-top">
      <div className="trp-names">
        <span className="trp-name-passenger">
          <User size={10} className="trp-name-icon" />
          {trip.passenger_name}
        </span>
        <ArrowRight size={10} className="trp-arrow" />
        <span className="trp-name-driver">
          <Bus size={10} className="trp-name-icon" />
          {trip.driver_name ?? '—'}
        </span>
      </div>

      <div className="trp-row-right">
        <span className="trp-fare">KSh {trip.fare.toLocaleString()}</span>
        <span className={`trp-status-pill ${statusClass(trip.status)}`}>
          {trip.status === 'ongoing' && <span className="trp-live-dot" />}
          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
        </span>
      </div>
    </div>

    {/* Middle: route + stops */}
    <div className="trp-row-mid">
      {trip.route_name && (
        <span className="trp-route-tag">
          <RouteDot colour={trip.route_colour} />
          {trip.route_name}
        </span>
      )}
      <span className="trp-stops">
        <MapPin size={9} className="trp-stop-icon" />
        {trip.from_stop}
        <ArrowRight size={9} className="trp-stop-arrow" />
        {trip.to_stop}
      </span>
    </div>

    {/* Bottom: time + payment */}
    <div className="trp-row-bottom">
      <span className="trp-time">
        <Clock size={9} />
        {trip.time}
        {trip.duration && <span className="trp-duration">· {trip.duration}</span>}
      </span>
      <div className="trp-payment">
        <span className={`trp-pay-chip ${payClass(trip.payment_status)}`}>
          {methodIcon(trip.payment_method)}
          {payLabel(trip.payment_status)}
        </span>
        {trip.payment_method && (
          <span className="trp-method">{trip.payment_method}</span>
        )}
      </div>
    </div>
  </div>
);

/* ── Group block ── */
const TripGroupBlock: React.FC<{ group: TripGroup }> = ({ group }) => (
  <div className="trp-group">
    <p className="trp-group-label">{group.label}</p>
    <div className="trp-group-list">
      {group.trips.map((t) => (
        <TripRow_ key={t.id} trip={t} />
      ))}
    </div>
  </div>
);

/* ── Full list ── */
interface Props {
  groups: TripGroup[];
}

const TripList: React.FC<Props> = ({ groups }) => {
  if (groups.length === 0) {
    return (
      <div className="trp-empty">
        <Bus size={32} strokeWidth={1.2} className="trp-empty-icon" />
        <p className="trp-empty-title">No trips found</p>
        <p className="trp-empty-sub">Adjust your filters to see results</p>
      </div>
    );
  }

  return (
    <div className="trp-list">
      {groups.map((g) => (
        <TripGroupBlock key={g.label} group={g} />
      ))}
    </div>
  );
};

export default TripList;