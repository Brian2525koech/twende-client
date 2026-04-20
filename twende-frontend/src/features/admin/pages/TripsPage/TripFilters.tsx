// src/features/admin/pages/TripsPage/TripFilters.tsx
import React, { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import type {
  StatusFilter,
  PaymentFilter,
  RouteOption,
  DateRange,
} from './types';

const STATUS_OPTS: { value: StatusFilter; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'completed', label: 'Completed' },
  { value: 'ongoing',   label: 'Ongoing'   },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_OPTS: { value: PaymentFilter; label: string }[] = [
  { value: 'all',          label: 'Any Payment'   },
  { value: 'paid',         label: 'Paid'          },
  { value: 'cash_pending', label: 'Cash Pending'  },
  { value: 'unpaid',       label: 'Unpaid'        },
  { value: 'waived',       label: 'Waived'        },
];

interface Props {
  statusFilter:     StatusFilter;
  onStatusFilter:   (v: StatusFilter) => void;
  paymentFilter:    PaymentFilter;
  onPaymentFilter:  (v: PaymentFilter) => void;
  routeFilter:      number | '';
  onRouteFilter:    (v: number | '') => void;
  routes:           RouteOption[];
  dateRange:        DateRange;
  onDateRange:      (v: DateRange) => void;
  totalShown:       number;
}

const TripFilters: React.FC<Props> = ({
  statusFilter, onStatusFilter,
  paymentFilter, onPaymentFilter,
  routeFilter, onRouteFilter,
  routes,
  dateRange, onDateRange,
  totalShown,
}) => {
  const [showExtra, setShowExtra] = useState(false);

  const hasActiveFilter =
    statusFilter  !== 'all' ||
    paymentFilter !== 'all' ||
    routeFilter   !== ''    ||
    dateRange.from !== ''   ||
    dateRange.to   !== '';

  const clearAll = () => {
    onStatusFilter('all');
    onPaymentFilter('all');
    onRouteFilter('');
    onDateRange({ from: '', to: '' });
  };

  return (
    <div className="trp-filters">

      {/* Status tabs */}
      <div className="trp-status-tabs">
        {STATUS_OPTS.map((opt) => (
          <button
            key={opt.value}
            className={`trp-status-tab${statusFilter === opt.value ? ' trp-tab-active' : ''}`}
            onClick={() => onStatusFilter(opt.value)}
            aria-pressed={statusFilter === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Secondary filter row */}
      <div className="trp-filter-row">

        {/* Payment dropdown */}
        <div className="trp-select-wrap">
          <select
            id="trp-payment-filter"
            className={`trp-select${paymentFilter !== 'all' ? ' trp-select-active' : ''}`}
            title="Filter by payment status"
            value={paymentFilter}
            onChange={(e) => onPaymentFilter(e.target.value as PaymentFilter)}
          >
            {PAYMENT_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={11} className="trp-select-chevron" />
        </div>

        {/* Route dropdown */}
        <div className="trp-select-wrap">
          <select
            id="trp-route-filter"
            className={`trp-select${routeFilter !== '' ? ' trp-select-active' : ''}`}
            title="Filter by route"
            value={routeFilter}
            onChange={(e) => onRouteFilter(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All Routes</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <ChevronDown size={11} className="trp-select-chevron" />
        </div>

        {/* Date range toggle */}
        <button
          className={`trp-date-toggle${showExtra ? ' trp-date-toggle-active' : ''}`}
          onClick={() => setShowExtra((v) => !v)}
          aria-expanded={showExtra}
          aria-label="Toggle date range filter"
        >
          <SlidersHorizontal size={12} />
          <span>Date</span>
        </button>

        {/* Clear all */}
        {hasActiveFilter && (
          <button
            className="trp-clear-btn"
            onClick={clearAll}
            aria-label="Clear all filters"
          >
            <X size={11} />
            <span>Clear</span>
          </button>
        )}

        {/* Total count badge */}
        <span className="trp-total-badge">{totalShown} trips</span>
      </div>

      {/* Date range panel */}
      {showExtra && (
        <div className="trp-date-range">
          <div className="trp-date-field">
            <label htmlFor="trp-date-from" className="trp-date-label">From</label>
            <input
              id="trp-date-from"
              type="date"
              className="trp-date-input"
              title="Start date"
              value={dateRange.from}
              onChange={(e) => onDateRange({ ...dateRange, from: e.target.value })}
            />
          </div>
          <span className="trp-date-sep">→</span>
          <div className="trp-date-field">
            <label htmlFor="trp-date-to" className="trp-date-label">To</label>
            <input
              id="trp-date-to"
              type="date"
              className="trp-date-input"
              title="End date"
              value={dateRange.to}
              onChange={(e) => onDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default TripFilters;