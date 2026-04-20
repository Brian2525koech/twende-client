// src/features/admin/pages/NotificationsPage/BroadcastFeed.tsx
import React from 'react';
import {
  Info, CheckCircle, AlertTriangle, Navigation,
  User, Route, Bus, Clock, Users,
} from 'lucide-react';
import type { BroadcastRecord, NotifType, SendMode } from './types';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function typeIcon(t: NotifType): React.ReactElement {
  if (t === 'success') return <CheckCircle  size={13} strokeWidth={2} />;
  if (t === 'warning') return <AlertTriangle size={13} strokeWidth={2} />;
  if (t === 'trip')    return <Navigation   size={13} strokeWidth={2} />;
  return <Info size={13} strokeWidth={2} />;
}

function modeIcon(m: SendMode): React.ReactElement {
  if (m === 'route')   return <Route size={11} strokeWidth={2} />;
  if (m === 'drivers') return <Bus   size={11} strokeWidth={2} />;
  return <User size={11} strokeWidth={2} />;
}

interface Props {
  broadcasts: BroadcastRecord[];
  loading:    boolean;
}

const BroadcastFeed: React.FC<Props> = ({ broadcasts, loading }) => {
  if (loading) {
    return (
      <div className="notif-feed-loading">
        <span className="notif-spinner dark" /> Loading broadcasts…
      </div>
    );
  }

  if (broadcasts.length === 0) {
    return (
      <div className="notif-feed-empty">
        <Info size={28} strokeWidth={1.2} className="notif-feed-empty-icon" />
        <p className="notif-feed-empty-title">No broadcasts yet</p>
        <p className="notif-feed-empty-sub">Sent notifications will appear here</p>
      </div>
    );
  }

  return (
    <div className="notif-feed">
      {broadcasts.map((b) => (
        <div key={b.id} className={`notif-feed-row notif-feed-row-${b.type}`}>

          {/* Type icon */}
          <div className={`notif-feed-icon notif-type-icon-${b.type}`}>
            {typeIcon(b.type)}
          </div>

          {/* Content */}
          <div className="notif-feed-content">
            <div className="notif-feed-top">
              <span className="notif-feed-title">{b.title}</span>
              <span className="notif-feed-time">
                <Clock size={9} />
                {timeAgo(b.sent_at)}
              </span>
            </div>
            <p className="notif-feed-message">{b.message}</p>
            <div className="notif-feed-meta">
              <span className={`notif-mode-chip notif-mode-${b.mode}`}>
                {modeIcon(b.mode)}
                {b.mode === 'user' ? 'Direct' : b.mode === 'route' ? 'Route' : 'Drivers'}
              </span>
              <span className="notif-feed-recipient">
                {b.recipient_label}
              </span>
              <span className="notif-feed-count">
                <Users size={9} />
                {b.recipient_count}
              </span>
            </div>
          </div>

        </div>
      ))}
    </div>
  );
};

export default BroadcastFeed;