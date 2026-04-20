// src/features/passenger/components/RatingModal.tsx
import React, { useState } from 'react';
import { X, Star, Send, Loader2 } from 'lucide-react';

interface RatingModalProps {
  trip: {
    id: string;
    driverName?: string;
    matatuNumber?: string;
    routeName?: string;
    from: string;
    to: string;
  };
  driverId: number;
  onClose: () => void;
  onSubmit: (scores: {
    punctuality_score: number;
    comfort_score: number;
    safety_score: number;
    overall_score: number;
    comment: string;
  }) => Promise<void>;
}

interface ScoreState {
  punctuality: number;
  comfort: number;
  safety: number;
  overall: number;
}

const CATEGORIES = [
  { key: 'punctuality' as const, label: 'Punctuality', emoji: '⏱️', desc: 'Did the matatu arrive on time?' },
  { key: 'comfort'     as const, label: 'Comfort',     emoji: '🪑', desc: 'How comfortable was the ride?' },
  { key: 'safety'      as const, label: 'Safety',      emoji: '🛡️', desc: 'Did you feel safe throughout?' },
  { key: 'overall'     as const, label: 'Overall',     emoji: '⭐', desc: 'Overall trip experience?' },
];

const StarRow: React.FC<{
  value: number;
  onChange: (v: number) => void;
}> = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="twende-star-row">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="twende-star-btn"
          aria-label={`${i} star`}
        >
          <Star
            size={28}
            className={`twende-star-icon ${i <= (hover || value) ? 'twende-star-lit' : 'twende-star-dim'}`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
};

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

const RatingModal: React.FC<RatingModalProps> = ({ trip, onClose, onSubmit }) => {
  const [scores, setScores] = useState<ScoreState>({ punctuality: 0, comfort: 0, safety: 0, overall: 0 });
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const setScore = (key: keyof ScoreState, val: number) =>
    setScores(prev => ({ ...prev, [key]: val }));

  const allScored = Object.values(scores).every(v => v > 0);

  const handleSubmit = async () => {
    if (!allScored) return;
    setLoading(true);
    try {
      await onSubmit({
        punctuality_score: scores.punctuality,
        comfort_score: scores.comfort,
        safety_score: scores.safety,
        overall_score: scores.overall,
        comment: comment.trim(),
      });
    } finally {
      setLoading(false);
    }
  };

  // Average for the preview
  const avg = allScored
    ? ((scores.punctuality + scores.comfort + scores.safety + scores.overall) / 4).toFixed(1)
    : null;

  return (
    <div className="twende-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="twende-modal-sheet twende-modal-sheet-tall">

        <button
          type="button"
          onClick={onClose}
          className="twende-modal-close"
          aria-label="Close rating modal"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Header */}
        <div className="twende-rating-header">
          <div className="twende-rating-avatar">
            <span className="twende-rating-avatar-letter">
              {(trip.driverName ?? 'D')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="twende-modal-subtitle" style={{ margin: 0 }}>Rate your driver</p>
            <h2 className="twende-modal-title" style={{ margin: '2px 0 0' }}>
              {trip.driverName ?? 'Driver'}
            </h2>
            <p className="twende-rating-meta">
              {trip.matatuNumber && <span>{trip.matatuNumber} · </span>}
              {trip.routeName || `${trip.from} → ${trip.to}`}
            </p>
          </div>
        </div>

        {/* Score categories */}
        <div className="twende-rating-categories">
          {CATEGORIES.map(cat => (
            <div key={cat.key} className="twende-rating-cat">
              <div className="twende-rating-cat-header">
                <span className="twende-rating-cat-emoji">{cat.emoji}</span>
                <div>
                  <p className="twende-rating-cat-label">{cat.label}</p>
                  <p className="twende-rating-cat-desc">{cat.desc}</p>
                </div>
                {scores[cat.key] > 0 && (
                  <span className="twende-rating-cat-badge">
                    {STAR_LABELS[scores[cat.key]]}
                  </span>
                )}
              </div>
              <StarRow value={scores[cat.key]} onChange={v => setScore(cat.key, v)} />
            </div>
          ))}
        </div>

        {/* Overall preview */}
        {avg && (
          <div className="twende-rating-avg">
            <span className="twende-rating-avg-num">{avg}</span>
            <div className="twende-rating-avg-stars">
              {[1,2,3,4,5].map(i => (
                <Star
                  key={i}
                  size={14}
                  className={i <= Math.round(parseFloat(avg)) ? 'twende-star-lit' : 'twende-star-dim'}
                  strokeWidth={1.5}
                />
              ))}
            </div>
            <span className="twende-rating-avg-label">Average rating</span>
          </div>
        )}

        {/* Comment */}
        <div className="twende-comment-wrap">
          <textarea
            placeholder="Leave a comment (optional) — What stood out about this trip?"
            maxLength={280}
            className="twende-comment-input"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
          />
          <span className="twende-comment-count">{comment.length}/280</span>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!allScored || loading}
          className="twende-modal-btn-primary"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Submitting…</>
          ) : (
            <><Send size={16} strokeWidth={2.5} /> Submit Rating</>
          )}
        </button>

        {!allScored && (
          <p className="twende-rating-hint">Rate all 4 categories to submit</p>
        )}
      </div>
    </div>
  );
};

export default RatingModal;