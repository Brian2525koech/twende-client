// src/features/admin/pages/DashboardPage/index.tsx
import React from 'react';
import {
  Bus, Users, Route, Zap,
  TrendingUp, Clock, RefreshCw,
  Sun, Moon, AlertCircle, Banknote,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminDashboard } from './useAdminDashboard';
import StatCard from './StatCard';
import SimulationPanel from './SimulationPanel';
import LiveActivityFeed from './LiveActivityFeed';
import AdminBottomNav from '../../components/AdminBottomNav';
import './adminDashboard.css';

const AdminDashboardPage: React.FC = () => {
  const { theme, toggleTheme }  = useTheme();
  const { user }                = useAuth();
  const {
    stats, drivers, waitingNow, recentTrips, recentRatings,
    loading, startingId, stoppingId,
    selectedSpeed, setSpeed,
    startSim, stopSim, stopAll, clearCache, refresh,
  } = useAdminDashboard();

  const runningCount = drivers.filter(d => d.simulation_running).length;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="adm-page">
        <div className="adm-loading">
          <div className="adm-loading-icon">
            <Zap size={30} strokeWidth={2} className="adm-loading-zap" />
          </div>
          <p className="adm-loading-text">Loading admin console…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-page">

      {/* ── HEADER ── */}
      <header className="adm-header">
        <div className="adm-header-inner">
          {/* Brand */}
          <div className="adm-brand">
            <div className="adm-brand-icon">
              <Bus size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="adm-brand-name">
                TWENDE<span className="adm-brand-dot">.</span>
                <span className="adm-brand-admin">ADMIN</span>
              </p>
              <p className="adm-brand-sub">
                Welcome, {user?.name?.split(' ')[0] ?? 'Admin'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="adm-header-controls">
            {/* Live sim count badge */}
            {runningCount > 0 && (
              <div className="adm-live-badge">
                <span className="adm-live-dot" />
                {runningCount} live
              </div>
            )}
            <button onClick={refresh} className="adm-icon-btn" aria-label="Refresh">
              <RefreshCw size={15} strokeWidth={2.5} />
            </button>
            <button onClick={toggleTheme} className="adm-icon-btn" aria-label="Toggle theme">
              {theme === 'dark'
                ? <Sun size={15} className="adm-sun" />
                : <Moon size={15} className="adm-moon" />
              }
            </button>
          </div>
        </div>

        {/* Alert bar when no sims running */}
        {drivers.length > 0 && runningCount === 0 && (
          <div className="adm-alert-bar">
            <AlertCircle size={13} strokeWidth={2.5} />
            <span>No simulations are running — start one below to see live tracking</span>
          </div>
        )}
      </header>

      <main className="adm-main">

        {/* ── PLATFORM STATS ── */}
        {stats && (
          <section className="adm-section">
            <p className="adm-section-label">Platform Overview</p>
            <div className="adm-stat-grid">
              <StatCard
                icon={<Zap size={20} strokeWidth={2} />}
                value={stats.running_sims ?? runningCount}
                label="Running Sims"
                sub={`${stats.active_drivers} drivers online`}
                variant="yellow"
                pulse={runningCount > 0}
              />
              <StatCard
                icon={<Users size={20} strokeWidth={2} />}
                value={stats.passengers_onboard}
                label="On Board"
                sub={`${stats.waiting_now} waiting`}
                variant="green"
                pulse={stats.passengers_onboard > 0}
              />
              <StatCard
                icon={<TrendingUp size={20} strokeWidth={2} />}
                value={stats.trips_today}
                label="Trips Today"
                sub="all statuses"
                variant="blue"
              />
              <StatCard
                icon={<Banknote size={20} strokeWidth={2} />}
                value={`KSh ${(stats.earnings_today ?? 0).toLocaleString()}`}
                label="Earned Today"
                sub="completed trips"
                variant="purple"
              />
              <StatCard
                icon={<Bus size={20} strokeWidth={2} />}
                value={`${stats.active_drivers}/${stats.total_drivers}`}
                label="Drivers"
                sub="online / total"
                variant="amber"
              />
              <StatCard
                icon={<Route size={20} strokeWidth={2} />}
                value={stats.total_routes}
                label="Routes"
                sub="in system"
                variant="red"
              />
            </div>
          </section>
        )}

        {/* ── SIMULATION CONTROL ── */}
        <section className="adm-section">
          {drivers.length === 0 ? (
            <div className="adm-empty-drivers">
              <Bus size={30} strokeWidth={1.2} className="adm-empty-icon" />
              <p className="adm-empty-title">No drivers found</p>
              <p className="adm-empty-sub">Add drivers from the Drivers page first</p>
            </div>
          ) : (
            <SimulationPanel
              drivers={drivers}
              startingId={startingId}
              stoppingId={stoppingId}
              selectedSpeed={selectedSpeed}
              onSetSpeed={setSpeed}
              onStart={startSim}
              onStop={stopSim}
              onStopAll={stopAll}
              onClearCache={() => clearCache()}
            />
          )}
        </section>

        {/* ── LIVE ACTIVITY FEED ── */}
        <section className="adm-section">
          <LiveActivityFeed
            waitingNow={waitingNow}
            recentTrips={recentTrips}
            recentRatings={recentRatings}
          />
        </section>

        <div className="adm-bottom-spacer" />
      </main>

      <AdminBottomNav />
    </div>
  );
};

export default AdminDashboardPage;