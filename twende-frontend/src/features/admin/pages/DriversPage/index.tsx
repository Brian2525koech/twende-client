// src/features/admin/pages/DriversPage/index.tsx
import React, { useState } from 'react';
import {
  Bus, Search, Plus, RefreshCw, Sun, Moon,
  SlidersHorizontal, X,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminDrivers } from './useAdminDrivers';
import DriverTable     from './DriverTable';
import DriverSidePanel from './DriverSidePanel';
import AddDriverModal  from './AddDriverModal';
import AdminBottomNav  from '../../components/AdminBottomNav';
import './adminDrivers.css';

const STATUS_FILTERS = [
  { value: 'all',     label: 'All Drivers' },
  { value: 'online',  label: 'Online'      },
  { value: 'offline', label: 'Offline'     },
] as const;

const AdminDriversPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const {
    filtered, routes, cities, loading,
    search, setSearch,
    statusFilter, setStatusFilter,
    cityFilter, setCityFilter,
    selectedDriver, setSelectedDriver,
    onboardMap, onboardLoading, fetchOnboard,
    startingId, stoppingId, selectedSpeed, setSpeed,
    startSim, stopSim, toggleActive, updateRoute, addDriver,
    refresh,
  } = useAdminDrivers();

  const [showAdd,     setShowAdd]     = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const liveCount = filtered.filter((d) => d.simulation_running).length;

  if (loading) {
    return (
      <div className="adm-page">
        <div className="adm-loading">
          <div className="adm-loading-icon">
            <Bus size={28} strokeWidth={2} className="adm-loading-zap" />
          </div>
          <p className="adm-loading-text">Loading drivers…</p>
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
                <span className="adm-brand-admin">DRIVERS</span>
              </p>
              <p className="adm-brand-sub">
                {filtered.length} driver{filtered.length !== 1 ? 's' : ''}
                {liveCount > 0 ? ` · ${liveCount} live` : ''}
              </p>
            </div>
          </div>

          <div className="adm-header-controls">
            {liveCount > 0 && (
              <div className="adm-live-badge">
                <span className="adm-live-dot" />
                {liveCount} live
              </div>
            )}
            <button
              className="drvr-add-btn"
              onClick={() => setShowAdd(true)}
              aria-label="Add new driver"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add</span>
            </button>
            <button onClick={refresh} className="adm-icon-btn" aria-label="Refresh drivers">
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
      </header>

      <main className="adm-main">

        {/* ── SEARCH + FILTERS ── */}
        <section className="adm-section">
          <div className="drvr-search-wrap">
            <Search size={14} className="drvr-search-icon" />
            <input
              className="drvr-search"
              placeholder="Search by name, email, plate, route…"
              title="Search drivers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="drvr-search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="drvr-filter-row">
            <div className="drvr-filter-tabs">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`drvr-filter-tab${statusFilter === f.value ? ' drvr-filter-active' : ''}`}
                  onClick={() => setStatusFilter(f.value)}
                  aria-pressed={statusFilter === f.value}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              className={`drvr-city-filter-btn${cityFilter ? ' drvr-city-filter-active' : ''}`}
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              aria-label="Filter by city"
            >
              <SlidersHorizontal size={12} />
              {cityFilter || 'All Cities'}
            </button>
          </div>

          {showFilters && (
            <div className="drvr-city-dropdown">
              <button
                className={`drvr-city-option${!cityFilter ? ' drvr-city-option-active' : ''}`}
                onClick={() => { setCityFilter(''); setShowFilters(false); }}
              >
                All Cities
              </button>
              {Array.from(
                new Set(filtered.map((d) => d.city_name).filter((c): c is string => Boolean(c)))
              ).map((c) => (
                <button
                  key={c}
                  className={`drvr-city-option${cityFilter === c ? ' drvr-city-option-active' : ''}`}
                  onClick={() => { setCityFilter(c); setShowFilters(false); }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── DRIVER LIST ── */}
        <section className="adm-section">
          <p className="adm-section-label">
            {statusFilter === 'all' ? 'All' : statusFilter === 'online' ? 'Online' : 'Offline'} Drivers
            <span className="drvr-count-badge">{filtered.length}</span>
          </p>
          <DriverTable
            drivers={filtered}
            onSelect={setSelectedDriver}
          />
        </section>

        <div className="adm-bottom-spacer" />
      </main>

      {/* ── SIDE PANEL ── */}
      {selectedDriver && (
        <DriverSidePanel
          driver={selectedDriver}
          routes={routes}
          onClose={() => setSelectedDriver(null)}
          onToggleActive={toggleActive}
          onUpdateRoute={updateRoute}
          onStartSim={startSim}
          onStopSim={stopSim}
          startingId={startingId}
          stoppingId={stoppingId}
          selectedSpeed={selectedSpeed}
          onSetSpeed={setSpeed}
          onboardPassengers={onboardMap[selectedDriver.user_id] ?? []}
          onboardLoading={onboardLoading}
          onFetchOnboard={fetchOnboard}
        />
      )}

      {/* ── ADD DRIVER MODAL ── */}
      {showAdd && (
        <AddDriverModal
          routes={routes}
          cities={cities}
          onClose={() => setShowAdd(false)}
          onSubmit={addDriver}
        />
      )}

      <AdminBottomNav />
    </div>
  );
};

export default AdminDriversPage;