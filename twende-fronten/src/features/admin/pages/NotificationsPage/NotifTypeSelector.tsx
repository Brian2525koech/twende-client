// src/features/admin/pages/NotificationsPage/NotifTypeSelector.tsx
import React from 'react';
import { Info, CheckCircle, AlertTriangle, Navigation } from 'lucide-react';
import type { NotifType } from './types';

const TYPES: { value: NotifType; label: string; icon: React.ReactElement; cls: string }[] = [
  { value: 'info',    label: 'Info',    icon: <Info        size={13} strokeWidth={2} />, cls: 'ntype-info'    },
  { value: 'success', label: 'Success', icon: <CheckCircle size={13} strokeWidth={2} />, cls: 'ntype-success' },
  { value: 'warning', label: 'Warning', icon: <AlertTriangle size={13} strokeWidth={2} />, cls: 'ntype-warning' },
  { value: 'trip',    label: 'Trip',    icon: <Navigation  size={13} strokeWidth={2} />, cls: 'ntype-trip'    },
];

interface Props {
  value:    NotifType;
  onChange: (v: NotifType) => void;
}

const NotifTypeSelector: React.FC<Props> = ({ value, onChange }) => (
  <div className="ntype-row">
    {TYPES.map((t) => (
      <button
        key={t.value}
        type="button"
        className={`ntype-chip ${t.cls}${value === t.value ? ' ntype-chip-active' : ''}`}
        onClick={() => onChange(t.value)}
        aria-pressed={value === t.value}
        aria-label={`Set type to ${t.label}`}
      >
        {t.icon}
        {t.label}
      </button>
    ))}
  </div>
);

export default NotifTypeSelector;