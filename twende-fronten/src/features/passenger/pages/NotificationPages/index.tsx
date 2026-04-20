// src/features/passenger/pages/NotificationsPage/index.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Bell, BellOff, CheckCheck,
  Trash2, RefreshCw, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from './useNotifications';
import NotificationCard from './NotificationCard';
import BottomNav from '../../components/BottomNav';
import { FILTER_TABS, groupByDate, type FilterTab } from './types';
import './notifications.css';

const NotificationsPage: React.FC = () => {
  const navigate             = useNavigate();
  const { user }             = useAuth();
  const [activeTab, setTab]  = useState<FilterTab>('all');

  const {
    notifications, unreadCount, loading,
    markRead, markAllRead, remove, clearRead, refresh,
  } = useNotifications(user?.id);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'unread': return notifications.filter(n => !n.is_read);
      case 'trip':   return notifications.filter(n => n.type === 'trip' || n.type === 'success');
      case 'info':   return notifications.filter(n => n.type === 'info' || n.type === 'warning');
      default:       return notifications;
    }
  }, [notifications, activeTab]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const groupKeys = Object.keys(grouped);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) { toast('No unread notifications', { icon: '✓' }); return; }
    await markAllRead();
    toast.success(`Marked ${unreadCount} as read`);
  };

  const handleClearRead = async () => {
    const readCount = notifications.filter(n => n.is_read).length;
    if (readCount === 0) { toast('No read notifications to clear'); return; }
    await clearRead();
    toast.success(`Cleared ${readCount} notifications`);
  };

  const handleDelete = async (id: number) => {
    await remove(id);
  };

  const handleMarkRead = async (id: number) => {
    await markRead(id);
  };

  return (
    <div className="np-page">

      {/* ── HEADER ── */}
      <header className="np-header">
        <div className="np-header-inner">
          <button
            onClick={() => navigate(-1)}
            className="np-back-btn"
            aria-label="Back"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>

          <div className="np-header-title-group">
            <h1 className="np-header-title">Notifications</h1>
            {unreadCount > 0 && (
              <span className="np-unread-badge">{unreadCount}</span>
            )}
          </div>

          <button
            onClick={refresh}
            className="np-icon-btn"
            aria-label="Refresh"
            disabled={loading}
          >
            <RefreshCw
              size={16}
              strokeWidth={2.5}
              className={loading ? 'np-spin' : ''}
            />
          </button>
        </div>

        {/* ── Filter tabs ── */}
        <div className="np-tabs">
          {FILTER_TABS.map(tab => {
            const count =
              tab.key === 'all'    ? notifications.length :
              tab.key === 'unread' ? notifications.filter(n => !n.is_read).length :
              tab.key === 'trip'   ? notifications.filter(n => n.type === 'trip' || n.type === 'success').length :
              notifications.filter(n => n.type === 'info' || n.type === 'warning').length;

            return (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`np-tab ${activeTab === tab.key ? 'np-tab-active' : ''}`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`np-tab-count ${activeTab === tab.key ? 'np-tab-count-active' : ''}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Bulk actions ── */}
        {notifications.length > 0 && (
          <div className="np-bulk-actions">
            {unreadCount > 0 && (
              <button className="np-bulk-btn" onClick={handleMarkAllRead}>
                <CheckCheck size={14} strokeWidth={2.5} />
                Mark all read
              </button>
            )}
            {notifications.some(n => n.is_read) && (
              <button className="np-bulk-btn np-bulk-btn-danger" onClick={handleClearRead}>
                <Trash2 size={14} strokeWidth={2.5} />
                Clear read
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── BODY ── */}
      <main className="np-main">

        {/* Loading */}
        {loading && (
          <div className="np-loading">
            <Loader2 size={26} className="np-spin text-[#1D9E75]" strokeWidth={2} />
            <p>Loading notifications…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="np-empty">
            <div className="np-empty-icon">
              <BellOff size={36} strokeWidth={1.2} className="np-empty-icon-svg" />
            </div>
            <p className="np-empty-title">
              {activeTab === 'unread'
                ? 'You\'re all caught up!'
                : 'No notifications yet'
              }
            </p>
            <p className="np-empty-sub">
              {activeTab === 'unread'
                ? 'No unread notifications right now.'
                : 'When something happens with your trips or matatu, you\'ll see it here.'
              }
            </p>
          </div>
        )}

        {/* Notification groups */}
        {!loading && groupKeys.map(dateGroup => (
          <section key={dateGroup} className="np-group">
            <div className="np-group-header">
              <span className="np-group-label">{dateGroup}</span>
              <div className="np-group-line" />
            </div>
            <div className="np-group-cards">
              {grouped[dateGroup].map((notif, idx) => (
                <NotificationCard
                  key={notif.id}
                  notification={notif}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                  animIndex={idx}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Bottom padding for nav bar */}
        <div className="np-bottom-spacer" />
      </main>
      <BottomNav />
    </div>
  );
};

export default NotificationsPage;