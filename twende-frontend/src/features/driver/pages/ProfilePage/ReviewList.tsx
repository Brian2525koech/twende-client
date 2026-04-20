// src/features/driver/pages/ProfilePage/ReviewList.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ChevronRight, MessageSquare } from 'lucide-react';
import type { DriverReview } from './types';
import { timeAgo } from './types';

interface Props {
  reviews: DriverReview[];
}

const ScorePill: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <span className={`dp-score-pill ${
    value >= 4 ? 'dp-pill-good' : value >= 3 ? 'dp-pill-ok' : 'dp-pill-low'
  }`}>
    {label} {value}★
  </span>
);

const ReviewList: React.FC<Props> = ({ reviews }) => {
  const navigate = useNavigate();

  if (reviews.length === 0) {
    return (
      <div className="dp-card dp-card-empty-rating">
        <MessageSquare size={28} strokeWidth={1.2} className="dp-star-dim" />
        <p className="dp-card-empty-text">No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="dp-card">
      <div className="dp-card-header">
        <p className="dp-card-title">Recent Reviews</p>
        <button className="dp-see-all-btn" onClick={() => navigate('/driver/ratings')}>
          See all <ChevronRight size={13} strokeWidth={2.5} />
        </button>
      </div>

      <div className="dp-reviews-list">
        {reviews.slice(0, 6).map(review => (
          <div key={review.id} className="dp-review-card">
            {/* Avatar */}
            <div className="dp-review-avatar">
              {(review.passenger_name || 'P')[0].toUpperCase()}
            </div>

            <div className="dp-review-body">
              {/* Name + overall stars + time */}
              <div className="dp-review-header">
                <p className="dp-review-name">
                  {review.passenger_name?.split(' ')[0] ?? 'Passenger'}
                </p>
                <div className="dp-review-score">
                  {[1,2,3,4,5].map(i => (
                    <Star
                      key={i}
                      size={12}
                      strokeWidth={1.5}
                      className={i <= review.overall_score ? 'dp-star-lit' : 'dp-star-dim'}
                    />
                  ))}
                  <span className="dp-review-overall">{review.overall_score}</span>
                </div>
                <span className="dp-review-time">{timeAgo(review.created_at)}</span>
              </div>

              {/* Comment */}
              {review.comment && (
                <p className="dp-review-comment">"{review.comment}"</p>
              )}

              {/* Category score pills */}
              <div className="dp-review-pills">
                <ScorePill label="Punct." value={review.punctuality_score} />
                <ScorePill label="Comfort" value={review.comfort_score} />
                <ScorePill label="Safety" value={review.safety_score} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewList;