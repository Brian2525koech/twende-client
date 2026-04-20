// src/features/driver/pages/TripsPage/TripStatsBar.tsx
import React from 'react';
import { Route, Banknote, Users, Clock } from 'lucide-react';
import type { TripStats } from './types';

interface Props {
  stats:   TripStats;
  loading: boolean;
}

interface StatProps {
  icon:    React.ReactNode;
  value:   string;
  label:   string;
  sub?:    string;
  variant: 'green' | 'blue' | 'amber' | 'purple';
}

const StatTile: React.FC<StatProps> = ({ icon, value, label, sub, variant }) => (
  <div className={`tstat-tile tstat-${variant}`}>
    <div className="tstat-icon-wrap">{icon}</div>
    <p className="tstat-value">{value}</p>
    <p className="tstat-label">{label}</p>
    {sub && <p className="tstat-sub">{sub}</p>}
  </div>
);

const TripStatsBar: React.FC<Props> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="tstat-grid">
        {[0,1,2,3].map(i => (
          <div key={i} className="tstat-skeleton" />
        ))}
      </div>
    );
  }

  const avgDur = stats.avg_duration_mins
    ? stats.avg_duration_mins >= 60
      ? `${Math.floor(stats.avg_duration_mins / 60)}h ${stats.avg_duration_mins % 60}m`
      : `${stats.avg_duration_mins}m`
    : '—';

  return (
    <div className="tstat-grid">
      <StatTile
        icon={<Route size={20} strokeWidth={2} />}
        value={stats.total_trips.toLocaleString()}
        label="Total Trips"
        sub={`${stats.completed_trips} completed`}
        variant="green"
      />
      <StatTile
        icon={<Banknote size={20} strokeWidth={2} />}
        value={`KSh ${stats.total_earnings.toLocaleString()}`}
        label="Earned"
        sub={`~KSh ${Math.round(stats.avg_fare)} avg`}
        variant="blue"
      />
      <StatTile
        icon={<Users size={20} strokeWidth={2} />}
        value={stats.total_passengers.toLocaleString()}
        label="Passengers"
        sub={stats.busiest_day ?? 'N/A'}
        variant="amber"
      />
      <StatTile
        icon={<Clock size={20} strokeWidth={2} />}
        value={avgDur}
        label="Avg Duration"
        sub={`${stats.cancelled_trips} cancelled`}
        variant="purple"
      />
    </div>
  );
};

export default TripStatsBar;