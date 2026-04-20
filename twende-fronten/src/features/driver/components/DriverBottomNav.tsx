// src/features/driver/components/DriverBottomNav.tsx
// Driver-side bottom navigation.
// Mirrors the passenger BottomNav pattern but with driver routes.
// Imports useNotifications to show the unread badge on Alerts.

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, Bell, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import './driverBottomNav.css';

const TABS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/driver/dashboard' },
  { icon: Map,             label: 'Map',        path: '/driver/map'       },
  { icon: Bell,            label: 'Alerts',     path: '/driver/notifications' },
  { icon: User,            label: 'Profile',    path: '/driver/profile'   },
] as const;

const DriverBottomNav: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();

  // Reuse the same notification hook — shows live unread count
  const { unreadCount } = useNotifications(user?.id);

  return (
    <nav className="drv-nav">
      <div className="drv-nav-inner">
        {TABS.map(({ icon: Icon, label, path }) => {
          const active   = location.pathname === path;
          const isAlerts = label === 'Alerts';

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`drv-nav-tab ${active ? 'drv-nav-tab-active' : ''}`}
              aria-label={label}
            >
              <div className="drv-nav-icon-wrap">
                <Icon
                  size={21}
                  strokeWidth={active ? 2.5 : 2}
                  className={`drv-nav-icon ${active ? 'drv-nav-icon-active' : ''}`}
                />
                {isAlerts && unreadCount > 0 && (
                  <span className="drv-nav-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={`drv-nav-label ${active ? 'drv-nav-label-active' : ''}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default DriverBottomNav;