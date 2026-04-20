// src/features/driver/pages/DashboardPage/index.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BusFront, Bell, RefreshCw, Sun, Moon,
  Map, TrendingUp, Star, User,
  Users, ChevronRight, UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useDriverDashboard } from './useDriverDashboard';
import StatusToggle from './StatusToggle';
import StatsStrip from './StatsStrip';
import WaitingCard from './WaitingCard';
import RecentActivity from './RecentActivity';
import DriverBottomNav from '../../components/DriverBottomNav';
import './dashboard.css';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user }              = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [boardingId, setBoardingId] = useState<number | null>(null);

  const {
    profile, stats, waitingPassengers,
    recentTrips, recentRatings,
    loading, togglingStatus, acceptingId, socketConnected,
    refresh, toggleStatus, acceptPassenger, markBoarded,
  } = useDriverDashboard();

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggleStatus = async (next: boolean) => {
    const id = toast.loading(next ? 'Going online…' : 'Going offline…');
    try {
      await toggleStatus(next);
      toast.success(next ? 'You are now online 🚌' : 'You are now offline', { id });
    } catch {
      toast.error('Failed to update status', { id });
    }
  };

  const handleAccept = async (waitId: number, stopName: string) => {
    const id = toast.loading('Accepting passenger…');
    try {
      await acceptPassenger(waitId);
      toast.success(`Accepted — head to ${stopName} 📍`, { id, duration: 4000 });
    } catch {
      toast.error('Failed to accept', { id });
    }
  };

  const handleBoard = async (waitId: number) => {
    setBoardingId(waitId);
    const id = toast.loading('Marking as boarded…');
    try {
      await markBoarded(waitId);
      toast.success('Passenger marked as boarded ✓', { id });
    } catch {
      toast.error('Failed', { id });
    } finally {
      setBoardingId(null);
    }
  };

  const waitingCount  = waitingPassengers.filter(w => w.status === 'waiting').length;
  const myPassengers  = waitingPassengers.filter(
    w => w.accepted_by_driver_id === user?.id
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="dd-page">
        <div className="dd-loading">
          <div className="dd-loading-icon">
            <BusFront size={32} className="dd-loading-bus" strokeWidth={2} />
          </div>
          <p className="dd-loading-text">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dd-page">

      {/* ── HEADER ── */}
      <header className="dd-header">
        <div className="dd-header-inner">
          {/* Logo + greeting */}
          <div className="dd-header-left">
            <div className="dd-logo">
              <BusFront size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="dd-greeting">
                {user?.name?.split(' ')[0] ?? 'Driver'}
              </p>
              <p className="dd-subgreeting">Driver Dashboard</p>
            </div>
          </div>

          {/* Right controls */}
          <div className="dd-header-right">
            <button
              onClick={refresh}
              className="dd-icon-btn"
              aria-label="Refresh"
              disabled={loading}
            >
              <RefreshCw size={15} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => navigate('/driver/notifications')}
              className="dd-icon-btn"
              aria-label="Notifications"
            >
              <Bell size={15} strokeWidth={2.5} />
            </button>
            <button
              onClick={toggleTheme}
              className="dd-icon-btn"
              aria-label="Toggle theme"
            >
              {theme === 'dark'
                ? <Sun size={15} className="dd-sun-icon" />
                : <Moon size={15} className="dd-moon-icon" />
              }
            </button>
          </div>
        </div>
      </header>

      <main className="dd-main">

        {/* ── STATUS TOGGLE ── */}
        {profile && (
          <StatusToggle
            profile={profile}
            toggling={togglingStatus}
            socketConnected={socketConnected}
            onToggle={handleToggleStatus}
          />
        )}

        {/* ── TODAY'S STATS ── */}
        {stats && profile && (
          <StatsStrip stats={stats} profile={profile} />
        )}

        {/* ── WAITING PASSENGERS ── */}
        <div className="dd-section">
          <div className="dd-section-row">
            <p className="dd-section-label">
              Waiting Passengers
              {waitingCount > 0 && (
                <span className="dd-waiting-badge">{waitingCount}</span>
              )}
            </p>
            <button
              onClick={() => navigate('/driver/map')}
              className="dd-map-btn"
            >
              <Map size={13} strokeWidth={2.5} />
              Map view
            </button>
          </div>

          {/* My accepted passengers banner */}
          {myPassengers.length > 0 && (
            <div className="dd-my-pass-banner">
              <UserCheck size={14} className="dd-my-pass-icon" strokeWidth={2.5} />
              <span>
                You accepted {myPassengers.length} passenger{myPassengers.length > 1 ? 's' : ''} — head to their stop
              </span>
            </div>
          )}

          {waitingPassengers.length === 0 ? (
            <div className="dd-empty-waiting">
              <Users size={32} strokeWidth={1.2} className="dd-empty-icon" />
              <p className="dd-empty-text">No passengers waiting on your route right now</p>
            </div>
          ) : (
            <div className="dd-waiting-list">
              {waitingPassengers.map(w => (
                <WaitingCard
                  key={w.id}
                  waiting={w}
                  myDriverId={user?.id ?? 0}
                  onAccept={() => handleAccept(w.id, w.stop_name)}
                  onBoard={() => handleBoard(w.id)}
                  isAccepting={acceptingId === w.id}
                  isBoarding={boardingId === w.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="dd-section">
          <p className="dd-section-label">Quick Actions</p>
          <div className="dd-quick-grid">
            {[
              { icon: Map,        label: 'Live Map',   sub: 'Route & passengers',   path: '/driver/map' },
              { icon: TrendingUp, label: 'My Trips',   sub: 'History & earnings',   path: '/driver/trips' },
              { icon: Star,       label: 'My Ratings', sub: 'Reviews from riders',  path: '/driver/ratings' },
              { icon: User,       label: 'My Profile', sub: 'Vehicle & photos',     path: '/driver/profile' },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="dd-quick-btn"
              >
                <div className="dd-quick-icon">
                  <action.icon size={20} strokeWidth={2} className="dd-quick-icon-svg" />
                </div>
                <div className="dd-quick-text">
                  <p className="dd-quick-label">{action.label}</p>
                  <p className="dd-quick-sub">{action.sub}</p>
                </div>
                <ChevronRight size={16} strokeWidth={2.5} className="dd-quick-chevron" />
              </button>
            ))}
          </div>
        </div>

        {/* ── RECENT ACTIVITY ── */}
        <RecentActivity
          recentTrips={recentTrips}
          recentRatings={recentRatings}
        />

        <div className="dd-bottom-spacer" />
      </main>
      <DriverBottomNav />
    </div>
  );
};

export default DashboardPage;