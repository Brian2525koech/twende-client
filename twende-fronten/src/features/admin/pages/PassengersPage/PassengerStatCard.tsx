// src/features/admin/pages/PassengersPage/PassengerStatCard.tsx
import React from 'react';

interface Props {
  icon:     React.ReactNode;
  value:    string | number;
  label:    string;
  sub?:     string;
  variant:  'yellow' | 'green' | 'blue' | 'purple' | 'amber' | 'red';
  pulse?:   boolean;
}

const PassengerStatCard: React.FC<Props> = ({
  icon, value, label, sub, variant, pulse = false,
}) => (
  <div className={`adm-stat-card adm-stat-${variant}`}>
    <div className="adm-stat-icon-wrap">
      {pulse && <span className="adm-stat-pulse-ring" />}
      {icon}
    </div>
    <p className="adm-stat-value">{value}</p>
    <p className="adm-stat-label">{label}</p>
    {sub && <p className="adm-stat-sub">{sub}</p>}
  </div>
);

export default PassengerStatCard;