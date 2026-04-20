// src/features/driver/pages/TripsPage/index.tsx
import React, { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Search, X, TrendingUp,
  RefreshCw, Loader2, Bus, SlidersHorizontal,
} from 'lucide-react';
import { useDriverTrips } from './useDriverTrips';
import TripStatsBar from './TripStatsBar';
import TripCard from './TripCard';
import DriverBottomNav from '../../components/DriverBottomNav';
import { groupTripsByDate, type FilterTab } from './types';
import './driverTrips.css';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'ongoing',   label: 'Ongoing' },
  { key: 'cancelled', label: 'Cancelled' },
];

const DriverTripsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    trips, stats,
    loading, loadingMore, statsLoading, hasMore,
    activeFilter, searchQuery,
    setFilter, setSearch, loadMore, refresh,
  } = useDriverTrips();

  // ── Infinite scroll sentinel ──────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setSentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadMore();
      }
    }, { threshold: 0.1 });
    observerRef.current.observe(node);
  }, [hasMore, loadingMore, loadMore]);

  const grouped   = groupTripsByDate(trips);
  const dateKeys  = Object.keys(grouped);
  const tripCount = trips.length;

  return (
    <div className="dtrips-page">

      {/* ── HEADER ── */}
      <header className="dtrips-header">
        <div className="dtrips-header-inner">
          <button
            onClick={() => navigate(-1)}
            className="dtrips-back-btn"
            aria-label="Back"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
          <div className="dtrips-header-title-group">
            <p className="dtrips-header-eyebrow">Driver</p>
            <h1 className="dtrips-header-title">Trip History</h1>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="dtrips-icon-btn"
            aria-label="Refresh"
          >
            <RefreshCw
              size={16}
              strokeWidth={2.5}
              className={loading ? 'dtrips-spin' : ''}
            />
          </button>
        </div>

        {/* Search bar */}
        <div className="dtrips-search-wrap">
          <div className="dtrips-search-inner">
            <Search size={15} strokeWidth={2.5} className="dtrips-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by route, stop or passenger…"
              className="dtrips-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearch('')}
                className="dtrips-search-clear"
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="dtrips-tabs">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`dtrips-tab ${activeFilter === tab.key ? 'dtrips-tab-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="dtrips-main">

        {/* ── STATS ── */}
        {stats && (
          <section className="dtrips-section">
            <div className="dtrips-section-header">
              <p className="dtrips-section-label">
                <TrendingUp size={13} strokeWidth={2.5} />
                Career Stats
              </p>
            </div>
            <TripStatsBar stats={stats} loading={statsLoading} />
          </section>
        )}

        {/* ── TRIP COUNT ── */}
        {!loading && (
          <div className="dtrips-count-row">
            <p className="dtrips-count-text">
              {searchQuery
                ? `${tripCount} result${tripCount !== 1 ? 's' : ''} for "${searchQuery}"`
                : activeFilter === 'all'
                  ? `${tripCount} trip${tripCount !== 1 ? 's' : ''} shown`
                  : `${tripCount} ${activeFilter} trip${tripCount !== 1 ? 's' : ''}`
              }
            </p>
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div className="dtrips-loading">
            <Loader2 size={26} strokeWidth={2} className="dtrips-spin dtrips-loader-icon" />
            <p className="dtrips-loading-text">Loading trips…</p>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && trips.length === 0 && (
          <div className="dtrips-empty">
            <div className="dtrips-empty-icon-wrap">
              <Bus size={34} strokeWidth={1.2} className="dtrips-empty-icon" />
            </div>
            <p className="dtrips-empty-title">
              {searchQuery
                ? 'No trips match your search'
                : activeFilter !== 'all'
                  ? `No ${activeFilter} trips yet`
                  : 'No trips recorded yet'
              }
            </p>
            <p className="dtrips-empty-sub">
              {searchQuery
                ? 'Try a different route name, stop, or passenger name'
                : 'Completed trips will appear here after each journey'
              }
            </p>
            {searchQuery && (
              <button onClick={() => setSearch('')} className="dtrips-empty-clear-btn">
                <X size={14} strokeWidth={2.5} />
                Clear search
              </button>
            )}
          </div>
        )}

        {/* ── GROUPED TRIPS ── */}
        {!loading && dateKeys.map(dateGroup => (
          <section key={dateGroup} className="dtrips-section">
            {/* Date group header */}
            <div className="dtrips-date-header">
              <span className="dtrips-date-label">{dateGroup}</span>
              <div className="dtrips-date-line" />
              <span className="dtrips-date-count">
                {grouped[dateGroup].length} trip{grouped[dateGroup].length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Daily earnings summary */}
            <div className="dtrips-daily-summary">
              <span className="dtrips-daily-pax">
                👥 {grouped[dateGroup].reduce((s, t) => s + t.passenger_count, 0)} passengers
              </span>
              <span className="dtrips-daily-earn">
                KSh {grouped[dateGroup]
                  .filter(t => t.status === 'completed')
                  .reduce((s, t) => s + t.fare, 0)
                  .toLocaleString()} earned
              </span>
            </div>

            {/* Trip cards */}
            <div className="dtrips-card-list">
              {grouped[dateGroup].map((trip, idx) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  animIndex={idx}
                />
              ))}
            </div>
          </section>
        ))}

        {/* ── LOAD MORE (infinite scroll sentinel) ── */}
        {!loading && hasMore && (
          <div ref={setSentinelRef} className="dtrips-sentinel">
            {loadingMore && (
              <div className="dtrips-loading-more">
                <Loader2 size={18} strokeWidth={2} className="dtrips-spin dtrips-loader-icon" />
                <span>Loading more…</span>
              </div>
            )}
          </div>
        )}

        {/* ── END OF LIST ── */}
        {!loading && !hasMore && trips.length > 0 && (
          <p className="dtrips-end-label">— End of trip history —</p>
        )}

        <div className="dtrips-bottom-spacer" />
      </main>

      <DriverBottomNav />
    </div>
  );
};

export default DriverTripsPage;