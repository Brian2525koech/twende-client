// src/features/admin/pages/PassengersPage/index.tsx
import React, { useState } from "react";
import {
  Users,
  RefreshCw,
  Sun,
  Moon,
  UsersRound,
  Clock,
  TrendingUp,
  Star,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAdminPassengers } from "./useAdminPassengers";
import PassengerStatCard from "./PassengerStatCard";
import WaitingPanel from "./WaitingPanel";
import PassengerTable from "./PassengerTable";
import TripActivityPanel from "./TripActivityPanel";
import AdminBottomNav from "../../components/AdminBottomNav";
import "./adminPassengers.css";

type ActiveTab = "waiting" | "passengers" | "trips";

const AdminPassengersPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<ActiveTab>("waiting");

  const {
    stats,
    passengers,
    waiting,
    trips,
    loading,
    waitingLoading,
    tripsLoading,
    search,
    setSearch,
    tripStatus,
    setTripStatus,
    paymentFilter,
    setPaymentFilter,
    dateFilter,
    setDateFilter,
    refresh,
  } = useAdminPassengers();

  const activeWaiting = waiting.filter(
    (w) =>
      w.status === "waiting" ||
      w.status === "accepted" ||
      w.status === "boarded",
  );

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="adm-page">
        <div className="adm-loading">
          <div className="adm-loading-icon">
            <Users size={30} strokeWidth={2} className="adm-loading-zap" />
          </div>
          <p className="adm-loading-text">Loading passenger data…</p>
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
            <div className="adm-brand-icon pass-brand-icon">
              <Users size={18} className="pass-brand-users" strokeWidth={2.5} />
            </div>
            <div>
              <p className="adm-brand-name">
                TWENDE<span className="adm-brand-dot">.</span>
                <span className="adm-brand-admin">PASSENGERS</span>
              </p>
              <p className="adm-brand-sub">
                Monitor waiting &amp; trip activity
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="adm-header-controls">
            {activeWaiting.length > 0 && (
              <div className="pass-waiting-badge">
                <span className="adm-live-dot" />
                {activeWaiting.length} waiting
              </div>
            )}
            <button
              onClick={refresh}
              className="adm-icon-btn"
              aria-label="Refresh"
            >
              <RefreshCw size={15} strokeWidth={2.5} />
            </button>
            <button
              onClick={toggleTheme}
              className="adm-icon-btn"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun size={15} className="adm-sun" />
              ) : (
                <Moon size={15} className="adm-moon" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="adm-main">
        {/* ── STATS ── */}
        {stats && (
          <section className="adm-section">
            <p className="adm-section-label">Passenger Overview</p>
            <div className="adm-stat-grid">
              <PassengerStatCard
                icon={<UsersRound size={20} strokeWidth={2} />}
                value={stats.total_passengers}
                label="Total Passengers"
                sub="all time"
                variant="blue"
              />
              <PassengerStatCard
                icon={<TrendingUp size={20} strokeWidth={2} />}
                value={stats.active_today}
                label="Active Today"
                sub="with trips"
                variant="green"
                pulse={stats.active_today > 0}
              />
              <PassengerStatCard
                icon={<Clock size={20} strokeWidth={2} />}
                value={stats.waiting_now}
                label="Waiting Now"
                sub="in queue"
                variant="yellow"
                pulse={stats.waiting_now > 0}
              />
              <PassengerStatCard
                icon={<Star size={20} strokeWidth={2} />}
                value={stats.trips_today}
                label="Trips Today"
                sub="all statuses"
                variant="purple"
              />
            </div>
          </section>
        )}

        {/* ── TABS ── */}
        <section className="adm-section">
          <div className="pass-tabs">
            <button
              className={`pass-tab${activeTab === "waiting" ? " pass-tab-active" : ""}`}
              onClick={() => setActiveTab("waiting")}
            >
              <Clock size={13} strokeWidth={2.5} />
              Live Queue
              {activeWaiting.length > 0 && (
                <span className="pass-tab-badge">{activeWaiting.length}</span>
              )}
            </button>
            <button
              className={`pass-tab${activeTab === "passengers" ? " pass-tab-active" : ""}`}
              onClick={() => setActiveTab("passengers")}
            >
              <Users size={13} strokeWidth={2.5} />
              Passengers
              <span className="pass-tab-badge">{passengers.length}</span>
            </button>
            <button
              className={`pass-tab${activeTab === "trips" ? " pass-tab-active" : ""}`}
              onClick={() => setActiveTab("trips")}
            >
              <TrendingUp size={13} strokeWidth={2.5} />
              Trip Activity
              <span className="pass-tab-badge">{trips.length}</span>
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "waiting" && (
            <WaitingPanel waiting={waiting} loading={waitingLoading} />
          )}
          {activeTab === "passengers" && (
            <PassengerTable
              passengers={passengers}
              search={search}
              onSearch={setSearch}
            />
          )}
          {activeTab === "trips" && (
            <TripActivityPanel
              trips={trips}
              loading={tripsLoading}
              tripStatus={tripStatus}
              onTripStatus={setTripStatus}
              paymentFilter={paymentFilter}
              onPaymentFilter={setPaymentFilter}
              dateFilter={dateFilter}
              onDateFilter={setDateFilter}
            />
          )}
        </section>

        <div className="adm-bottom-spacer" />
      </main>

      <AdminBottomNav />
    </div>
  );
};

export default AdminPassengersPage;
