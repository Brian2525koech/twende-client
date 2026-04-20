// src/features/driver/pages/DashboardPage/StatsStrip.tsx
import React from 'react';
import { Banknote, Route, Users, Star } from 'lucide-react';
import type { DashboardStats, DriverProfile } from './types';

interface Props {
  stats:   DashboardStats;
  profile: DriverProfile;
}

interface StatCardProps {
  icon:      React.ReactNode;
  value:     string;
  label:     string;
  variant:   'green' | 'blue' | 'amber' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, variant }) => (
  <div className={`sstat-card sstat-${variant}`}>
    <div className="sstat-icon-wrap">{icon}</div>
    <p className="sstat-value">{value}</p>
    <p className="sstat-label">{label}</p>
  </div>
);

const StatsStrip: React.FC<Props> = ({ stats, profile }) => (
  <div className="sstat-section">
    <p className="dd-section-label">Today's Performance</p>
    <div className="sstat-grid">
      <StatCard
        icon={<Banknote size={20} strokeWidth={2} />}
        value={`KSh ${stats.earnings_today.toLocaleString()}`}
        label="Earnings"
        variant="green"
      />
      <StatCard
        icon={<Route size={20} strokeWidth={2} />}
        value={String(stats.trips_today)}
        label="Trips"
        variant="blue"
      />
      <StatCard
        icon={<Users size={20} strokeWidth={2} />}
        value={String(stats.passengers_today)}
        label="Passengers"
        variant="amber"
      />
      <StatCard
        icon={<Star size={20} strokeWidth={2} />}
        value={profile.average_rating > 0 ? profile.average_rating.toFixed(1) : '—'}
        label="Rating"
        variant="purple"
      />
    </div>
  </div>
);

export default StatsStrip;