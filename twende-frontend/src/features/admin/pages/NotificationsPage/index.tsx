// src/features/admin/pages/NotificationsPage/index.tsx
import React from 'react';
import { Bell, RefreshCw, Sun, Moon, User, Route, Bus } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminNotifications } from './useAdminNotifications';
import SendToUserPanel    from './SendToUserPanel';
import SendToRoutePanel   from './SendToRoutePanel';
import SendToDriversPanel from './SendToDriversPanel';
import BroadcastFeed      from './BroadcastFeed';
import AdminBottomNav     from '../../components/AdminBottomNav';
import './adminNotifications.css';

import type { SendMode } from './types';

const MODES: { value: SendMode; label: string; icon: React.ReactElement }[] = [
  { value: 'user',    label: 'To User',    icon: <User  size={13} strokeWidth={2.5} /> },
  { value: 'route',   label: 'To Route',   icon: <Route size={13} strokeWidth={2.5} /> },
  { value: 'drivers', label: 'All Drivers',icon: <Bus   size={13} strokeWidth={2.5} /> },
];

const AdminNotificationsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const {
    activeMode, setActiveMode,
    routes,
    broadcasts, broadcastsLoading,
    userQuery, setUserQuery,
    userResults, userSearching,
    selectedUser, setSelectedUser,
    userForm, setUserForm,
    routeForm, setRouteForm,
    driversForm, setDriversForm,
    sendToUser, sendToRoute, sendToDrivers,
    sending,
    refresh,
  } = useAdminNotifications();

  return (
    <div className="adm-page">

      {/* ── HEADER ── */}
      <header className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-brand">
            <div className="adm-brand-icon">
              <Bell size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="adm-brand-name">
                TWENDE<span className="adm-brand-dot">.</span>
                <span className="adm-brand-admin">NOTIFY</span>
              </p>
              <p className="adm-brand-sub">Broadcast notifications</p>
            </div>
          </div>

          <div className="adm-header-controls">
            <button onClick={refresh} className="adm-icon-btn" aria-label="Refresh">
              <RefreshCw size={15} strokeWidth={2.5} />
            </button>
            <button onClick={toggleTheme} className="adm-icon-btn" aria-label="Toggle theme">
              {theme === 'dark'
                ? <Sun  size={15} className="adm-sun"  />
                : <Moon size={15} className="adm-moon" />
              }
            </button>
          </div>
        </div>
      </header>

      <main className="adm-main">

        {/* ── MODE TABS ── */}
        <section className="adm-section">
          <p className="adm-section-label">Send Notification</p>
          <div className="notif-mode-tabs">
            {MODES.map((m) => (
              <button
                key={m.value}
                className={`notif-mode-tab${activeMode === m.value ? ' notif-mode-active' : ''}`}
                onClick={() => setActiveMode(m.value)}
                aria-pressed={activeMode === m.value}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── COMPOSE PANEL ── */}
        <section className="adm-section">
          {activeMode === 'user' && (
            <SendToUserPanel
              userQuery={userQuery}
              onQueryChange={setUserQuery}
              userResults={userResults}
              userSearching={userSearching}
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
              onClearUser={() => {
                setSelectedUser(null);
                setUserQuery('');
                setUserForm({ ...userForm, user_id: null });
              }}
              form={userForm}
              onFormChange={setUserForm}
              onSend={sendToUser}
              sending={sending}
            />
          )}
          {activeMode === 'route' && (
            <SendToRoutePanel
              routes={routes}
              form={routeForm}
              onFormChange={setRouteForm}
              onSend={sendToRoute}
              sending={sending}
            />
          )}
          {activeMode === 'drivers' && (
            <SendToDriversPanel
              form={driversForm}
              onFormChange={setDriversForm}
              onSend={sendToDrivers}
              sending={sending}
            />
          )}
        </section>

        {/* ── RECENT BROADCASTS ── */}
        <section className="adm-section">
          <p className="adm-section-label">
            Recent Broadcasts
            <span className="notif-count-badge">{broadcasts.length}</span>
          </p>
          <BroadcastFeed
            broadcasts={broadcasts}
            loading={broadcastsLoading}
          />
        </section>

        <div className="adm-bottom-spacer" />
      </main>

      <AdminBottomNav />
    </div>
  );
};

export default AdminNotificationsPage;