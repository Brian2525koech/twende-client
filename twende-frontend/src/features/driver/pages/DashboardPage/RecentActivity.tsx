// src/features/driver/pages/DashboardPage/RecentActivity.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, ArrowRight, Star, ChevronRight } from 'lucide-react';
import type { RecentTrip, RecentRating } from './types';
import { timeAgo } from './types';

interface Props {
  recentTrips:   RecentTrip[];
  recentRatings: RecentRating[];
}

const MiniStars: React.FC<{ score: number }> = ({ score }) => (
  <div className="ra-stars">
    {[1,2,3,4,5].map(i => (
      <Star
        key={i}
        size={11}
        strokeWidth={1.5}
        className={i <= score ? 'ra-star-lit' : 'ra-star-dim'}
      />
    ))}
  </div>
);

const RecentActivity: React.FC<Props> = ({ recentTrips, recentRatings }) => {
  const navigate = useNavigate();

  if (recentTrips.length === 0 && recentRatings.length === 0) return null;

  return (
    <div className="ra-section">

      {/* Recent ratings */}
      {recentRatings.length > 0 && (
        <div className="ra-block">
          <div className="ra-block-header">
            <p className="dd-section-label">Recent Reviews</p>
            <button className="ra-see-all" onClick={() => navigate('/driver/ratings')}>
              See all <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          </div>
          <div className="ra-list">
            {recentRatings.map((r, i) => (
              <div key={i} className="ra-rating-card">
                <div className="ra-rating-avatar">
                  {(r.passenger_name || 'P')[0].toUpperCase()}
                </div>
                <div className="ra-rating-content">
                  <div className="ra-rating-top">
                    <p className="ra-rating-name">
                      {r.passenger_name?.split(' ')[0] ?? 'Passenger'}
                    </p>
                    <MiniStars score={r.overall_score} />
                  </div>
                  {r.comment && (
                    <p className="ra-rating-comment">"{r.comment}"</p>
                  )}
                  <p className="ra-rating-time">{timeAgo(r.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent trips */}
      {recentTrips.length > 0 && (
        <div className="ra-block">
          <div className="ra-block-header">
            <p className="dd-section-label">Recent Trips</p>
            <button className="ra-see-all" onClick={() => navigate('/driver/trips')}>
              See all <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          </div>
          <div className="ra-list">
            {recentTrips.map(trip => (
              <div key={trip.id} className="ra-trip-card">
                <div className="ra-trip-icon">
                  <Bus size={16} strokeWidth={2} className="ra-trip-bus-icon" />
                </div>
                <div className="ra-trip-info">
                  <p className="ra-trip-route">
                    {trip.from_stop}
                    <ArrowRight size={11} className="ra-trip-arrow" />
                    {trip.to_stop}
                  </p>
                  <p className="ra-trip-meta">
                    {trip.time} · {trip.passenger_count} passenger{trip.passenger_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="ra-trip-right">
                  <p className="ra-trip-fare">KSh {Number(trip.fare).toLocaleString()}</p>
                  <span className={`ra-trip-status ra-status-${trip.status}`}>{trip.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;