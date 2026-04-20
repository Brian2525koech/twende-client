// src/features/passenger/pages/MapPage/BusPopup.tsx
import React from 'react';
import { Star, Zap, Clock, Users, MapPin } from 'lucide-react';
import type { Driver } from './types';
import { toNum, etaLabel } from './types';

interface Props {
  driver: Driver;
  isDark: boolean;
  userLat: number | null;
  userLng: number | null;
}

const StarRow: React.FC<{ score: number }> = ({ score }) => (
  <div className="buspop-stars">
    {[1,2,3,4,5].map(i => (
      <Star
        key={i}
        size={12}
        className={i <= Math.round(score) ? 'star-lit' : 'star-dim'}
        strokeWidth={1.5}
      />
    ))}
    <span className="buspop-rating-val">{score.toFixed(1)}</span>
    <span className="buspop-rating-cnt">({score} avg)</span>
  </div>
);

const BusPopup: React.FC<Props> = ({ driver, isDark }) => {
  const rating    = toNum(driver.average_rating);
  const speed     = toNum(driver.speed);
  const pax       = driver.passengers ?? 0;
  const cap       = driver.capacity ?? 14;
  const fillPct   = Math.min(100, Math.round((pax / cap) * 100));
  const isFull    = pax >= cap;
  const isWaiting = driver.is_waiting ?? false;

  // Best ETA from stops_eta (closest stop)
  const bestETA = driver.stops_eta && driver.stops_eta.length > 0
    ? Math.min(...driver.stops_eta.map(s => s.eta_minutes))
    : null;

  const barColor = isFull
    ? 'linear-gradient(90deg,#ef4444,#f87171)'
    : fillPct > 70
      ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
      : 'linear-gradient(90deg,#1D9E75,#23c494)';

  return (
    <div className="buspop-card" data-dark={isDark ? 'true' : 'false'}>

      {/* ── Header ── */}
      <div className="buspop-header">
        <div className="buspop-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="22" height="13" rx="2"/>
            <path d="M5 16v2a1 1 0 001 1h1a1 1 0 001-1v-2M15 16v2a1 1 0 001 1h1a1 1 0 001-1v-2"/>
            <line x1="1" y1="8" x2="23" y2="8"/>
          </svg>
        </div>
        <div className="buspop-titles">
          <p className="buspop-name">{driver.driver_name}</p>
          <p className="buspop-plate">{driver.plate_number}</p>
        </div>
        {isWaiting ? (
          <span className="buspop-badge buspop-badge-stopped">⏸ Stopped</span>
        ) : bestETA !== null && bestETA <= 3 ? (
          <span className="buspop-badge buspop-badge-arriving">Arriving!</span>
        ) : null}
      </div>

      {/* ── Rating ── */}
      {rating > 0 && <StarRow score={rating} />}

      {/* ── Speed + ETA ── */}
      <div className="buspop-info-row">
        {speed > 0 && (
          <div className="buspop-info-chip">
            <Zap size={11} strokeWidth={2.5} />
            <span>{speed.toFixed(0)} km/h</span>
          </div>
        )}
        {bestETA !== null && (
          <div className={`buspop-info-chip ${bestETA <= 2 ? 'chip-arriving' : bestETA <= 5 ? 'chip-soon' : ''}`}>
            <Clock size={11} strokeWidth={2.5} />
            <span>{etaLabel(bestETA)} away</span>
          </div>
        )}
        <div className="buspop-info-chip">
          <Users size={11} strokeWidth={2.5} />
          <span>{pax}/{cap} seats</span>
        </div>
      </div>

      {/* ── Capacity bar ── */}
      <div className="buspop-cap-block">
        <div className="buspop-cap-bar-track">
          <div
            className="buspop-cap-bar-fill"
            style={{ width: `${fillPct}%`, background: barColor }}
          />
        </div>
        <p className="buspop-cap-status" style={{ color: isFull ? '#ef4444' : '#1D9E75' }}>
          {isFull
            ? '🔴 Full — wait for the next matatu'
            : fillPct > 70
              ? '🟡 Almost full — board quickly'
              : '🟢 Space available — board now'
          }
        </p>
      </div>

      {/* ── Next stop ETAs (top 3) ── */}
      {driver.stops_eta && driver.stops_eta.length > 0 && (
        <div className="buspop-etas">
          <p className="buspop-etas-label">Next stops</p>
          {driver.stops_eta.slice(0, 3).map(s => (
            <div key={s.id} className="buspop-eta-row">
              <MapPin size={10} strokeWidth={2.5} className="buspop-eta-pin" />
              <span className="buspop-eta-name">{s.name}</span>
              <span className={`buspop-eta-val ${s.eta_minutes <= 2 ? 'eta-arriving' : s.eta_minutes <= 5 ? 'eta-soon' : ''}`}>
                {etaLabel(s.eta_minutes)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BusPopup;