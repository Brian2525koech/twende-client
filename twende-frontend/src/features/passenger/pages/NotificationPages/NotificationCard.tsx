// src/features/passenger/pages/NotificationsPage/NotificationCard.tsx
import React, { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { type Notification, typeConfig, timeAgo } from './types';

interface Props {
  notification: Notification;
  onMarkRead:   (id: number) => void;
  onDelete:     (id: number) => void;
  animIndex:    number; // for staggered entrance animation
}

const NotificationCard: React.FC<Props> = ({
  notification: n,
  onMarkRead,
  onDelete,
  animIndex,
}) => {
  const [removing, setRemoving] = useState(false);
  const cfg = typeConfig[n.type] ?? typeConfig.info;

  const handleDelete = () => {
    setRemoving(true);
    // Let CSS animation play before removing from DOM
    setTimeout(() => onDelete(n.id), 280);
  };

  const handleMarkRead = () => {
    if (!n.is_read) onMarkRead(n.id);
  };

  return (
    <div
      className={`nc-card ${n.is_read ? 'nc-read' : 'nc-unread'} ${removing ? 'nc-removing' : ''}`}
      style={{ animationDelay: `${animIndex * 45}ms` }}
      onClick={handleMarkRead}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleMarkRead()}
    >
      {/* Unread indicator bar */}
      {!n.is_read && (
        <div
          className="nc-unread-bar"
          style={{ background: cfg.color }}
        />
      )}

      {/* Type icon */}
      <div
        className="nc-icon-wrap"
        style={{ background: cfg.bg }}
      >
        <span className="nc-icon-emoji">{cfg.icon}</span>
      </div>

      {/* Content */}
      <div className="nc-content">
        <div className="nc-header-row">
          <p className="nc-title">{n.title}</p>
          <span className="nc-time">{timeAgo(n.created_at)}</span>
        </div>
        <p className="nc-message">{n.message}</p>

        {/* Type badge */}
        <span
          className="nc-type-badge"
          style={{ color: cfg.color, background: cfg.bg }}
        >
          {n.type.toUpperCase()}
        </span>
      </div>

      {/* Actions */}
      <div className="nc-actions">
        {!n.is_read && (
          <button
            className="nc-action-btn nc-read-btn"
            onClick={e => { e.stopPropagation(); onMarkRead(n.id); }}
            title="Mark as read"
            aria-label="Mark as read"
          >
            <Check size={14} strokeWidth={2.5} />
          </button>
        )}
        <button
          className="nc-action-btn nc-delete-btn"
          onClick={e => { e.stopPropagation(); handleDelete(); }}
          title="Delete"
          aria-label="Delete notification"
        >
          <Trash2 size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default NotificationCard;