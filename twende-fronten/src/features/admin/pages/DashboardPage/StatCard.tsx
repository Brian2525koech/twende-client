// src/features/admin/pages/DashboardPage/StatCard.tsx
import React from 'react';

interface Props {
  icon:    React.ReactNode;
  value:   string | number;
  label:   string;
  sub?:    string;
  variant: 'yellow' | 'green' | 'blue' | 'red' | 'purple' | 'amber';
  pulse?:  boolean;
}

const StatCard: React.FC<Props> = ({ icon, value, label, sub, variant, pulse }) => (
  <div className={`adm-stat-card adm-stat-${variant}`}>
    <div className="adm-stat-icon-wrap">
      {icon}
      {pulse && <div className="adm-stat-pulse-ring" />}
    </div>
    <p className="adm-stat-value">{value}</p>
    <p className="adm-stat-label">{label}</p>
    {sub && <p className="adm-stat-sub">{sub}</p>}
  </div>
);

export default StatCard;