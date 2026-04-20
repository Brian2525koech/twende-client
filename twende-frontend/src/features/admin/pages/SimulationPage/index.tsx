// src/features/admin/pages/SimulationPage/index.tsx
import React, { useState } from "react";
import {
  Zap,
  RefreshCw,
  Square,
  Sun,
  Moon,
  Activity,
  Bus,
  AlertCircle,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSimulation } from "./useSimulation";
import SimDriverCard from "./SimDriverCard";
import AdminBottomNav from "../../components/AdminBottomNav";
import "./simulation.css";

type ViewFilter = "all" | "running" | "stopped";

const SimulationPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [searchQ, setSearchQ] = useState("");

  const {
    drivers,
    loading,
    polling,
    startingId,
    stoppingId,
    selectedSpeed,
    setSpeed,
    startSim,
    stopSim,
    stopAll,
    clearCache,
    toggleMap,
    refresh,
  } = useSimulation();

  const running = drivers.filter((d) => !!d.sim?.isRunning);
  const stopped = drivers.filter((d) => !d.sim?.isRunning);

  const visible = drivers
    .filter((d) => {
      if (filter === "running") return !!d.sim?.isRunning;
      if (filter === "stopped") return !d.sim?.isRunning;
      return true;
    })
    .filter(
      (d) =>
        !searchQ ||
        d.driver_name.toLowerCase().includes(searchQ.toLowerCase()) ||
        d.plate_number.toLowerCase().includes(searchQ.toLowerCase()) ||
        (d.route_name ?? "").toLowerCase().includes(searchQ.toLowerCase()),
    );

  const totalOnboard = drivers.reduce((s, d) => s + d.onboard.length, 0);

  if (loading) {
    return (
      <div className="simp-page">
        <div className="simp-loading">
          <div className="simp-loading-icon">
            <Zap size={28} strokeWidth={2} className="simp-loading-zap" />
          </div>
          <p className="simp-loading-text">Loading simulation console…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="simp-page">
      {/* ── HEADER ── */}
      <header className="simp-header">
        <div className="simp-header-inner">
          {/* Title */}
          <div className="simp-title-group">
            <div className="simp-title-icon">
              <Zap size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="simp-eyebrow">Admin Console</p>
              <h1 className="simp-title">Simulation Control</h1>
            </div>
          </div>

          {/* Right controls */}
          <div className="simp-header-controls">
            {/* Polling indicator */}
            {polling && (
              <div className="simp-polling-badge">
                <Activity size={11} strokeWidth={2.5} />
                Syncing
              </div>
            )}
            <button
              onClick={refresh}
              className="simp-icon-btn"
              aria-label="Refresh"
              disabled={loading}
            >
              <RefreshCw
                size={15}
                strokeWidth={2.5}
                className={loading ? "simp-spin" : ""}
              />
            </button>
            <button
              onClick={toggleTheme}
              className="simp-icon-btn"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun size={15} className="simp-sun" />
              ) : (
                <Moon size={15} className="simp-moon" />
              )}
            </button>
          </div>
        </div>

        {/* Global actions bar */}
        <div className="simp-actions-bar">
          <div className="simp-global-stats">
            <span className="simp-stat-pill simp-pill-running">
              <span className="simp-live-dot" />
              {running.length} running
            </span>
            <span className="simp-stat-pill simp-pill-stopped">
              {stopped.length} stopped
            </span>
            {totalOnboard > 0 && (
              <span className="simp-stat-pill simp-pill-onboard">
                <Bus size={10} strokeWidth={2.5} />
                {totalOnboard} on board
              </span>
            )}
          </div>
          <div className="simp-global-btns">
            <button
              onClick={() => clearCache()}
              className="simp-global-btn simp-btn-cache"
            >
              ↺ Clear All Cache
            </button>
            {running.length > 0 && (
              <button
                onClick={stopAll}
                className="simp-global-btn simp-btn-stop-all"
              >
                <Square size={12} strokeWidth={2.5} />
                Stop All
              </button>
            )}
          </div>
        </div>

        {/* Alert when nothing running */}
        {drivers.length > 0 && running.length === 0 && (
          <div className="simp-alert">
            <AlertCircle size={13} strokeWidth={2.5} />
            No simulations running — start one below to activate live bus
            tracking
          </div>
        )}
      </header>

      <main className="simp-main">
        {/* ── SEARCH + FILTER ── */}
        <div className="simp-toolbar">
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search by driver, plate or route…"
            className="simp-search"
          />
          <div className="simp-filter-tabs">
            {(
              [
                ["all", `All (${drivers.length})`],
                ["running", `Running (${running.length})`],
                ["stopped", `Stopped (${stopped.length})`],
              ] as [ViewFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`simp-filter-tab ${filter === key ? "simp-filter-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── RUNNING SECTION (pinned first) ── */}
        {filter !== "stopped" &&
          running.filter(
            (d) =>
              !searchQ ||
              d.driver_name.toLowerCase().includes(searchQ.toLowerCase()) ||
              d.plate_number.toLowerCase().includes(searchQ.toLowerCase()) ||
              (d.route_name ?? "")
                .toLowerCase()
                .includes(searchQ.toLowerCase()),
          ).length > 0 && (
            <section className="simp-section">
              <p className="simp-section-label">
                <span className="simp-running-dot-lbl" />
                Active Simulations
              </p>
              <div className="simp-card-grid">
                {running
                  .filter(
                    (d) =>
                      !searchQ ||
                      d.driver_name
                        .toLowerCase()
                        .includes(searchQ.toLowerCase()) ||
                      d.plate_number
                        .toLowerCase()
                        .includes(searchQ.toLowerCase()) ||
                      (d.route_name ?? "")
                        .toLowerCase()
                        .includes(searchQ.toLowerCase()),
                  )
                  .map((driver) => (
                    <SimDriverCard
                      key={driver.user_id}
                      driver={driver}
                      selectedSpeed={selectedSpeed[driver.user_id] ?? 20}
                      isStarting={startingId === driver.user_id}
                      isStopping={stoppingId === driver.user_id}
                      onSetSpeed={(speed) => setSpeed(driver.user_id, speed)}
                      onStart={() => startSim(driver.user_id)}
                      onStop={() => stopSim(driver.user_id)}
                      onToggleMap={() => toggleMap(driver.user_id)}
                      onClearCache={() =>
                        clearCache(driver.route_id ?? undefined)
                      }
                    />
                  ))}
              </div>
            </section>
          )}

        {/* ── STOPPED / ALL SECTION ── */}
        {filter !== "running" &&
          stopped.filter(
            (d) =>
              !searchQ ||
              d.driver_name.toLowerCase().includes(searchQ.toLowerCase()) ||
              d.plate_number.toLowerCase().includes(searchQ.toLowerCase()) ||
              (d.route_name ?? "")
                .toLowerCase()
                .includes(searchQ.toLowerCase()),
          ).length > 0 && (
            <section className="simp-section">
              <p className="simp-section-label">
                {filter === "all" ? "Stopped Drivers" : "Stopped Drivers"}
              </p>
              <div className="simp-card-grid">
                {stopped
                  .filter(
                    (d) =>
                      !searchQ ||
                      d.driver_name
                        .toLowerCase()
                        .includes(searchQ.toLowerCase()) ||
                      d.plate_number
                        .toLowerCase()
                        .includes(searchQ.toLowerCase()) ||
                      (d.route_name ?? "")
                        .toLowerCase()
                        .includes(searchQ.toLowerCase()),
                  )
                  .map((driver) => (
                    <SimDriverCard
                      key={driver.user_id}
                      driver={driver}
                      selectedSpeed={selectedSpeed[driver.user_id] ?? 20}
                      isStarting={startingId === driver.user_id}
                      isStopping={stoppingId === driver.user_id}
                      onSetSpeed={(speed) => setSpeed(driver.user_id, speed)}
                      onStart={() => startSim(driver.user_id)}
                      onStop={() => stopSim(driver.user_id)}
                      onToggleMap={() => toggleMap(driver.user_id)}
                      onClearCache={() =>
                        clearCache(driver.route_id ?? undefined)
                      }
                    />
                  ))}
              </div>
            </section>
          )}

        {/* Empty state */}
        {visible.length === 0 && !loading && (
          <div className="simp-empty">
            <Bus size={36} strokeWidth={1.2} className="simp-empty-icon" />
            <p className="simp-empty-title">
              {searchQ ? "No drivers match your search" : "No drivers found"}
            </p>
            <p className="simp-empty-sub">
              {searchQ
                ? "Try a different name, plate, or route"
                : "Add drivers from the Drivers page"}
            </p>
          </div>
        )}

        <div className="simp-bottom-spacer" />
      </main>

      <AdminBottomNav />
    </div>
  );
};

export default SimulationPage;
