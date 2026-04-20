// src/features/driver/pages/RatingsPage/index.tsx

import { useState, useEffect, type CSSProperties } from 'react';
import {
  Bus,
  Star,
  Sun,
  Moon,
  AlertCircle,
  BarChart2,
  Clock,
  Shield,
  Sofa,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { useDriverRatings } from './useDriverRatings';
import {
  pillClass,
  timeAgo,
  initials,
  filterRatings,
  type FilterTab,
  type RatingEntry,
} from './types';
import DriverBottomNav from '../../components/DriverBottomNav';
import './driverRatings.css';

// ── Helpers ────────────────────────────────────────────────

function StarRow({ score, size = 12 }: { score: number; size?: number }) {
  return (
    <span className="dr-stars">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(score) ? 'dr-star-lit' : 'dr-star-dim'}
        />
      ))}
    </span>
  );
}

// ── Sub-components ──────────────────────────────────────────

function ReviewCard({ r }: { r: RatingEntry }) {
  return (
    <div className="dr-review-card">
      <div className="dr-review-avatar">{initials(r.passenger_name)}</div>
      <div className="dr-review-body">
        <div className="dr-review-header">
          <p className="dr-review-name">{r.passenger_name}</p>
          <span className="dr-review-stars">
            <StarRow score={r.overall_score} size={11} />
            <span className="dr-review-overall">{r.overall_score.toFixed(1)}</span>
          </span>
          <span className="dr-review-time">{timeAgo(r.created_at)}</span>
        </div>

        {r.comment ? (
          <p className="dr-review-comment">"{r.comment}"</p>
        ) : (
          <p className="dr-review-no-comment">No comment left.</p>
        )}

        <div className="dr-review-pills">
          <span className={`dr-score-pill ${pillClass(r.punctuality_score)}`}>
            Punctuality · {r.punctuality_score}
          </span>
          <span className={`dr-score-pill ${pillClass(r.comfort_score)}`}>
            Comfort · {r.comfort_score}
          </span>
          <span className={`dr-score-pill ${pillClass(r.safety_score)}`}>
            Safety · {r.safety_score}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function DriverRatingsPage() {
  const { data, loading, error } = useDriverRatings();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [tab, setTab] = useState<FilterTab>('all');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="dr-page">
        <div className="dr-loading">
          <div className="dr-loading-icon">
            <Bus size={32} className="dr-loading-icon-inner" />
          </div>
          <div className="dr-spinner" />
          <p className="dr-loading-text">Loading ratings…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !data) {
    return (
      <div className="dr-page">
        <div className="dr-error">
          <AlertCircle size={36} className="dr-error-icon" />
          <p className="dr-error-title">Could not load ratings</p>
          <p className="dr-error-sub">{error ?? 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const {
    average_punctuality,
    average_comfort,
    average_safety,
    average_overall,
    total_ratings,
    total_trips,
    ratings,
  } = data;

  // Distribution counts (stars 5 → 1)
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: ratings.filter(r => r.overall_score === star).length,
  }));

  const filtered = filterRatings(ratings, tab);
  const engagementPct = total_trips > 0 ? Math.round((total_ratings / total_trips) * 100) : 0;

  const tabDef: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: '5', label: '5 ★' },
    { id: '4', label: '4 ★' },
    { id: 'low', label: '3★ & below' },
  ];

  function tabCount(id: FilterTab): number {
    return filterRatings(ratings, id).length;
  }

  return (
    <div className="dr-page">
      {/* ── Header ── */}
      <header className="dr-header">
        <div className="dr-header-inner">
          <div className="dr-logo">
            <div className="dr-logo-icon">
              <Bus size={20} color="white" />
            </div>
            <span className="dr-logo-text">
              Twende<span className="dr-logo-dot">.</span>
            </span>
          </div>
          <button
            className="dr-icon-btn"
            onClick={() => setDark(d => !d)}
            aria-label="Toggle theme"
          >
            {dark ? (
              <Sun size={16} className="dr-sun-icon" />
            ) : (
              <Moon size={16} className="dr-moon-icon" />
            )}
          </button>
        </div>
      </header>

      <main className="dr-main">
        {/* ── Page title ── */}
        <div className="dr-page-title-row">
          <div className="dr-page-title-icon">
            <BarChart2 size={20} />
          </div>
          <div>
            <h1 className="dr-page-title">My Ratings</h1>
            <p className="dr-page-subtitle">All passenger reviews for your matatu</p>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="dr-stats-strip">
          <div className="dr-stat">
            <Star size={14} className="dr-stat-icon" />
            <span className="dr-stat-val">{average_overall.toFixed(1)}</span>
            <span className="dr-stat-lbl">Overall</span>
          </div>
          <div className="dr-stat-sep" />
          <div className="dr-stat">
            <MessageSquare size={14} className="dr-stat-icon" />
            <span className="dr-stat-val">{total_ratings}</span>
            <span className="dr-stat-lbl">Reviews</span>
          </div>
          <div className="dr-stat-sep" />
          <div className="dr-stat">
            <Bus size={14} className="dr-stat-icon" />
            <span className="dr-stat-val">{total_trips}</span>
            <span className="dr-stat-lbl">Trips</span>
          </div>
          <div className="dr-stat-sep" />
          <div className="dr-stat">
            <TrendingUp size={14} className="dr-stat-icon" />
            <span className="dr-stat-val">{engagementPct}%</span>
            <span className="dr-stat-lbl">Rated</span>
          </div>
        </div>

        {/* ── Overall score + distribution ── */}
        <div className="dr-card">
          <p className="dr-card-title">Overall Score</p>
          <div className="dr-score-hero">
            <div className="dr-score-big">
              <span className="dr-score-num">{average_overall.toFixed(1)}</span>
              <StarRow score={average_overall} size={14} />
              <span className="dr-score-total">{total_ratings} reviews</span>
            </div>
            <div className="dr-dist-list">
              {dist.map(({ star, count }) => {
                const pct = total_ratings > 0 ? (count / total_ratings) * 100 : 0;
                const fillStyle: CSSProperties = { width: `${pct}%` };
                return (
                  <div key={star} className="dr-dist-row">
                    <span className="dr-dist-label">{star}</span>
                    <div className="dr-dist-track">
                      <div className="dr-dist-fill" style={fillStyle} />
                    </div>
                    <span className="dr-dist-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Category averages ── */}
        <div className="dr-card">
          <p className="dr-card-title">Category Averages</p>
          <div className="dr-cat-list">
            {[
              { label: 'Punctuality', val: average_punctuality, Icon: Clock },
              { label: 'Comfort',     val: average_comfort,     Icon: Sofa },
              { label: 'Safety',      val: average_safety,      Icon: Shield },
            ].map(({ label, val, Icon }) => {
              const fillStyle: CSSProperties = { width: `${(val / 5) * 100}%` };
              return (
                <div key={label} className="dr-cat-row">
                  <div className="dr-cat-icon-wrap">
                    <Icon size={14} />
                  </div>
                  <span className="dr-cat-label">{label}</span>
                  <div className="dr-cat-track">
                    <div className="dr-cat-fill" style={fillStyle} />
                  </div>
                  <span className="dr-cat-val">{val.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Engagement card ── */}
        <div className="dr-engagement-card">
          <div className="dr-engagement-icon">
            <TrendingUp size={16} />
          </div>
          <div className="dr-engagement-body">
            <p className="dr-engagement-label">Passenger Engagement</p>
            <p className="dr-engagement-val">
              {total_ratings} of {total_trips} trips rated
            </p>
          </div>
          <div className="dr-engagement-track">
            <div
              className="dr-engagement-fill"
              style={{ width: `${Math.min(engagementPct, 100)}%` } as CSSProperties}
            />
          </div>
          <span className="dr-engagement-pct">{engagementPct}%</span>
        </div>

        {/* ── Filter tabs ── */}
        <div className="dr-filter-row">
          {tabDef.map(({ id, label }) => {
            const count = tabCount(id);
            const isActive = tab === id;
            return (
              <button
                key={id}
                className={`dr-filter-tab${isActive ? ' dr-filter-tab-active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
                <span
                  className={`dr-filter-count${isActive ? '' : ' dr-filter-count-inactive'}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Reviews list ── */}
        {filtered.length === 0 ? (
          <div className="dr-empty">
            <Star size={38} className="dr-empty-icon" />
            <p className="dr-empty-title">No reviews here</p>
            <p className="dr-empty-sub">
              {tab === 'all'
                ? 'Passengers will leave reviews after their trips.'
                : 'No reviews match this filter yet.'}
            </p>
          </div>
        ) : (
          <div className="dr-reviews-section">
            <div className="dr-section-header">
              <p className="dr-section-title">
                {tab === 'all' ? 'All Reviews' : `${tab === 'low' ? '3★ & below' : `${tab}★`} Reviews`}
              </p>
              <span className="dr-section-count">{filtered.length} review{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="dr-review-list">
              {filtered.map(r => (
                <ReviewCard key={r.id} r={r} />
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="dr-footer">
          <div className="dr-footer-brand">
            <div className="dr-footer-icon">
              <Bus size={12} color="white" />
            </div>
            <span className="dr-footer-name">Twende</span>
          </div>
          <p className="dr-footer-tag">Driver · Ratings</p>
        </footer>

        <div className="dr-bottom-spacer" />
      </main>
      <DriverBottomNav />
    </div>
  );
}