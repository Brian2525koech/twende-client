// src/features/admin/pages/PassengersPage/TripActivityPanel.tsx
import React from 'react';
import {
  ArrowRight, Clock, CreditCard, Banknote,
  TrendingUp, Loader2, CalendarDays,
} from 'lucide-react';
import type { TripRow } from './types';
import type { TripStatusFilter, PaymentFilter } from './useAdminPassengers';
import { timeAgo } from './types';

interface Props {
  trips:           TripRow[];
  loading:         boolean;
  tripStatus:      TripStatusFilter;
  onTripStatus:    (v: TripStatusFilter) => void;
  paymentFilter:   PaymentFilter;
  onPaymentFilter: (v: PaymentFilter) => void;
  dateFilter:      string;
  onDateFilter:    (v: string) => void;
}

const STATUS_OPTIONS: { value: TripStatusFilter; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'completed', label: 'Completed' },
  { value: 'ongoing',   label: 'Ongoing'   },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: 'all',          label: 'Any Payment' },
  { value: 'paid',         label: 'Paid'        },
  { value: 'cash_pending', label: 'Cash'        },
  { value: 'unpaid',       label: 'Unpaid'      },
];

const TripActivityPanel: React.FC<Props> = ({
  trips, loading,
  tripStatus, onTripStatus,
  paymentFilter, onPaymentFilter,
  dateFilter, onDateFilter,
}) => (
  <div className="pass-trip-panel">

    {/* Filter bar */}
    <div className="pass-trip-filters">
      {/* Status chips */}
      <div className="pass-filter-group">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`pass-filter-chip${tripStatus === opt.value ? ' pass-chip-active' : ''}`}
            onClick={() => onTripStatus(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Payment chips */}
      <div className="pass-filter-group">
        {PAYMENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`pass-filter-chip${paymentFilter === opt.value ? ' pass-chip-active' : ''}`}
            onClick={() => onPaymentFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Date picker */}
      <div className="pass-date-wrap">
        <CalendarDays size={12} strokeWidth={2.5} className="pass-date-icon" />
        <input
          type="date"
          className="pass-date-input"
          value={dateFilter}
          onChange={(e) => onDateFilter(e.target.value)}
          aria-label="Filter trips by date"
          title="Filter trips by date"
        />
        {dateFilter && (
          <button className="pass-date-clear" onClick={() => onDateFilter('')}>✕</button>
        )}
      </div>
    </div>

    {/* Trips list */}
    {loading ? (
      <div className="pass-trips-loading">
        <Loader2 size={18} className="pass-spin" />
        <span>Loading trips…</span>
      </div>
    ) : trips.length === 0 ? (
      <div className="pass-empty">
        <TrendingUp size={28} strokeWidth={1.3} className="pass-empty-icon" />
        <p className="pass-empty-title">No trips found</p>
        <p className="pass-empty-sub">Try adjusting your filters</p>
      </div>
    ) : (
      <div className="pass-trips-list">
        {trips.map((t) => (
          <div key={t.id} className="pass-trip-row">
            {/* Status dot */}
            <div className={`pass-trip-dot pass-tdot-${t.status}`} />

            {/* Content */}
            <div className="pass-trip-content">
              {/* Top: passenger → driver */}
              <div className="pass-trip-parties">
                <span className="pass-trip-passenger">{t.passenger_name}</span>
                <ArrowRight size={10} strokeWidth={2.5} className="pass-trip-arrow" />
                <span className="pass-trip-driver">{t.driver_name ?? 'Unassigned'}</span>
              </div>

              {/* Route */}
              <p className="pass-trip-route">{t.route_name}</p>

              {/* Stops */}
              <div className="pass-trip-stops">
                <span className="pass-from-stop">{t.from_stop}</span>
                <ArrowRight size={9} strokeWidth={2.5} className="pass-trip-arrow-sm" />
                <span className="pass-to-stop">{t.to_stop}</span>
              </div>
            </div>

            {/* Right */}
            <div className="pass-trip-right">
              <span className="pass-trip-fare">KSh {Number(t.fare).toLocaleString()}</span>

              {/* Payment status */}
              <span className={`pass-pay-chip pass-pay-${t.payment_status}`}>
                {t.payment_status === 'paid'         && <CreditCard size={8} strokeWidth={2.5} />}
                {t.payment_status === 'cash_pending' && <Banknote   size={8} strokeWidth={2.5} />}
                {t.payment_status === 'paid'         ? 'Paid'
                  : t.payment_status === 'cash_pending' ? 'Cash'
                  : t.payment_status === 'unpaid'       ? 'Unpaid'
                  : 'Waived'}
              </span>

              {/* Time */}
              <div className="pass-trip-time">
                <Clock size={9} strokeWidth={2.5} />
                <span>{timeAgo(t.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default TripActivityPanel;