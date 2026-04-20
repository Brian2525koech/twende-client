// src/features/admin/components/AdminBottomNav.tsx
import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  Bus,
  Route,
  Users,
  MapPin,
  Bell,
} from 'lucide-react';
import './adminBottomNav.css';

const TABS = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/admin'                },
  { icon: Zap,             label: 'Simulation',   path: '/admin/simulation'     },
  { icon: Bus,             label: 'Drivers',      path: '/admin/drivers'        },
  { icon: Route,           label: 'Routes',       path: '/admin/routes'         },
  { icon: Users,           label: 'Passengers',   path: '/admin/passengers'     },
  { icon: MapPin,          label: 'Trips',        path: '/admin/trips'          },
  { icon: Bell,            label: 'Alerts',       path: '/admin/notifications'  },
] as const;

const AdminBottomNav: React.FC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const navRef     = useRef<HTMLDivElement>(null);
  const activeRef  = useRef<HTMLButtonElement>(null);

  // scroll the active tab into the centre of the nav bar whenever route changes
  useEffect(() => {
    if (activeRef.current && navRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [location.pathname]);

  return (
    <nav className="adm-nav">
      <div className="adm-nav-inner" ref={navRef}>
        {TABS.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              ref={active ? activeRef : null}
              onClick={() => navigate(path)}
              className={`adm-nav-tab ${active ? 'adm-nav-tab-active' : ''}`}
              aria-label={label}
            >
              <div className="adm-nav-icon-wrap">
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className={`adm-nav-icon ${active ? 'adm-nav-icon-active' : ''}`}
                />
              </div>
              <span className={`adm-nav-label ${active ? 'adm-nav-label-active' : ''}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default AdminBottomNav;