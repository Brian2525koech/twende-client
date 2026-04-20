// src/features/driver/pages/ProfilePage/RatingSummary.tsx
import React from 'react';
import { Star, Clock, Shield, ThumbsUp } from 'lucide-react';
import type { RatingBreakdown, DriverProfileData } from './types';

interface Props {
  profile:   DriverProfileData;
  breakdown: RatingBreakdown;
}

const StarRow: React.FC<{ score: number; size?: number }> = ({ score, size = 15 }) => (
  <div className="dp-stars">
    {[1,2,3,4,5].map(i => (
      <Star
        key={i}
        size={size}
        strokeWidth={1.5}
        className={i <= Math.round(score) ? 'dp-star-lit' : 'dp-star-dim'}
      />
    ))}
  </div>
);

const DistBar: React.FC<{ stars: number; count: number; total: number }> = ({
  stars, count, total,
}) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="dp-dist-row">
      <span className="dp-dist-label">{stars}</span>
      <Star size={10} strokeWidth={1.5} className="dp-star-lit" />
      <div className="dp-dist-track">
        <div className="dp-dist-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="dp-dist-count">{count}</span>
    </div>
  );
};

const RatingSummary: React.FC<Props> = ({ profile, breakdown }) => {
  const total = profile.total_ratings;
  const avg   = profile.average_rating;

  if (total === 0 || !breakdown) {
    return (
      <div className="dp-card dp-card-empty-rating">
        <Star size={28} strokeWidth={1.2} className="dp-star-dim" />
        <p className="dp-card-empty-text">No ratings yet</p>
        <p className="dp-card-empty-sub">
          Complete more trips — passengers will rate you after each journey.
        </p>
      </div>
    );
  }

  return (
    <div className="dp-card">
      <p className="dp-card-title">Rating Overview</p>

      {/* Big score + bars */}
      <div className="dp-rating-overview">
        <div className="dp-rating-big">
          <span className="dp-rating-num">{avg.toFixed(1)}</span>
          <StarRow score={avg} size={16} />
          <span className="dp-rating-total">{total} review{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="dp-dist-list">
          {[5,4,3,2,1].map(s => (
            <DistBar
              key={s}
              stars={s}
              count={breakdown.distribution[s] ?? 0}
              total={total}
            />
          ))}
        </div>
      </div>

      {/* Category averages */}
      <div className="dp-divider" />
      <div className="dp-cat-row">
        {[
          { label: 'Punctuality', val: breakdown.avg_punctuality, icon: Clock },
          { label: 'Safety',      val: breakdown.avg_safety,      icon: Shield },
          { label: 'Comfort',     val: breakdown.avg_comfort,     icon: ThumbsUp },
        ].map(({ label, val, icon: Icon }) => (
          <div key={label} className="dp-cat-item">
            <Icon size={15} strokeWidth={2} className="dp-cat-icon" />
            <span className="dp-cat-val">{(val || 0).toFixed(1)}</span>
            <span className="dp-cat-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RatingSummary;