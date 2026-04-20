// src/features/admin/pages/TripsPage/index.tsx
import React from 'react';
import { Bus, RefreshCw, Sun, Moon, TrendingUp } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminTrips } from './useAdminTrips';
import TripStatCards from './TripStatCards';
import TripFilters   from './TripFilters';
import TripList      from './TripList';
import AdminBottomNav from '../../components/AdminBottomNav';
import './adminTrips.css';

const AdminTripsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const {
    groups,
    stats,
    routes,
    loading,
    statusFilter,  setStatusFilter,
    paymentFilter, setPaymentFilter,
    routeFilter,   setRouteFilter,
    dateRange,     setDateRange,
    totalShown,
    refresh,
  } = useAdminTrips();

  if (loading) {
    return (
      <div className="adm-page">
        <div className="adm-loading">
          <div className="adm-loading-icon">
            <TrendingUp size={28} strokeWidth={2} className="adm-loading-zap" />
          </div>
          <p className="adm-loading-text">Loading trips…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-page">

      {/* ── HEADER ── */}
      <header className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-brand">
            <div className="adm-brand-icon">
              <Bus size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="adm-brand-name">
                TWENDE<span className="adm-brand-dot">.</span>
                <span className="adm-brand-admin">TRIPS</span>
              </p>
              <p className="adm-brand-sub">
                {totalShown} trip{totalShown !== 1 ? 's' : ''} shown
              </p>
            </div>
          </div>

          <div className="adm-header-controls">
            <button
              onClick={refresh}
              className="adm-icon-btn"
              aria-label="Refresh trips"
            >
              <RefreshCw size={15} strokeWidth={2.5} />
            </button>
            <button
              onClick={toggleTheme}
              className="adm-icon-btn"
              aria-label="Toggle theme"
            >
              {theme === 'dark'
                ? <Sun  size={15} className="adm-sun"  />
                : <Moon size={15} className="adm-moon" />
              }
            </button>
          </div>
        </div>
      </header>

      <main className="adm-main">

        {/* ── STATS ── */}
        {stats && (
          <section className="adm-section">
            <p className="adm-section-label">Today's Overview</p>
            <TripStatCards stats={stats} />
          </section>
        )}

        {/* ── FILTERS ── */}
        <section className="adm-section">
          <TripFilters
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            paymentFilter={paymentFilter}
            onPaymentFilter={setPaymentFilter}
            routeFilter={routeFilter}
            onRouteFilter={setRouteFilter}
            routes={routes}
            dateRange={dateRange}
            onDateRange={setDateRange}
            totalShown={totalShown}
          />
        </section>

        {/* ── TRIP LIST ── */}
        <section className="adm-section">
          <TripList groups={groups} />
        </section>

        <div className="adm-bottom-spacer" />
      </main>

      <AdminBottomNav />
    </div>
  );
};

export default AdminTripsPage;