// src/features/admin/pages/TripsPage/TripStatCards.tsx
import React from 'react';
import { TrendingUp, Banknote, Zap, Clock } from 'lucide-react';
import type { TripStats } from './types';

interface Props {
  stats: TripStats | null;
}

const TripStatCards: React.FC<Props> = ({ stats }) => (
  <div className="trp-stat-grid">
    <div className="trp-stat-card trp-stat-blue">
      <div className="trp-stat-icon-wrap">
        <TrendingUp size={18} strokeWidth={2} />
      </div>
      <p className="trp-stat-value">{stats?.trips_today ?? '—'}</p>
      <p className="trp-stat-label">Trips Today</p>
    </div>

    <div className="trp-stat-card trp-stat-green">
      <div className="trp-stat-icon-wrap">
        <Banknote size={18} strokeWidth={2} />
      </div>
      <p className="trp-stat-value">
        KSh {(stats?.fare_today ?? 0).toLocaleString()}
      </p>
      <p className="trp-stat-label">Fare Today</p>
    </div>

    <div className="trp-stat-card trp-stat-yellow">
      <div className="trp-stat-icon-wrap">
        <Zap size={18} strokeWidth={2} />
      </div>
      <p className="trp-stat-value">{stats?.ongoing_count ?? '—'}</p>
      <p className="trp-stat-label">Ongoing</p>
    </div>

    <div className="trp-stat-card trp-stat-amber">
      <div className="trp-stat-icon-wrap">
        <Clock size={18} strokeWidth={2} />
      </div>
      <p className="trp-stat-value">{stats?.cash_pending_count ?? '—'}</p>
      <p className="trp-stat-label">Cash Pending</p>
    </div>
  </div>
);

export default TripStatCards;