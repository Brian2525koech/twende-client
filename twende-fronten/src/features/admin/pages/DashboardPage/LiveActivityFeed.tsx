// src/features/admin/pages/DashboardPage/LiveActivityFeed.tsx
import React, { useState } from 'react';
import { MapPin, ArrowRight, Star, Clock } from 'lucide-react';
import type { WaitingNow, RecentTrip, RecentRating } from './types';
import { timeAgo } from './types';

type FeedTab = 'waiting' | 'trips' | 'ratings';

interface Props {
  waitingNow:    WaitingNow[];
  recentTrips:   RecentTrip[];
  recentRatings: RecentRating[];
}

const LiveActivityFeed: React.FC<Props> = ({ waitingNow, recentTrips, recentRatings }) => {
  const [tab, setTab] = useState<FeedTab>('waiting');

  const TABS: { key: FeedTab; label: string; count: number }[] = [
    { key: 'waiting', label: 'Waiting Now', count: waitingNow.length },
    { key: 'trips',   label: 'Recent Trips', count: recentTrips.length },
    { key: 'ratings', label: 'Ratings',      count: recentRatings.length },
  ];

  return (
    <div className="feed-card">
      <p className="adm-section-label" style={{ marginBottom: 12 }}>Live Activity</p>

      {/* Tabs */}
      <div className="feed-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`feed-tab ${tab === t.key ? 'feed-tab-active' : ''}`}
          >
            {t.label}
            {t.count > 0 && <span className="feed-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="feed-content">

        {/* Waiting passengers */}
        {tab === 'waiting' && (
          waitingNow.length === 0 ? (
            <p className="feed-empty">No passengers waiting right now</p>
          ) : waitingNow.map(w => (
            <div key={w.id} className="feed-row">
              <div className={`feed-row-dot ${w.status === 'accepted' ? 'dot-accepted' : 'dot-waiting'}`} />
              <div className="feed-row-content">
                <p className="feed-row-title">
                  {w.passenger_name}
                  <span className="feed-row-route"> · {w.route_name}</span>
                </p>
                <p className="feed-row-sub">
                  <MapPin size={10} strokeWidth={2.5} className="feed-sub-icon" />
                  {w.stop_name}
                  {w.destination_name && (
                    <><ArrowRight size={9} className="feed-sub-arrow" />{w.destination_name}</>
                  )}
                </p>
              </div>
              <div className="feed-row-right">
                <span className={`feed-status-pill ${w.status === 'accepted' ? 'pill-accepted' : 'pill-waiting'}`}>
                  {w.status}
                </span>
                <span className="feed-time">
                  <Clock size={9} strokeWidth={2} />{timeAgo(w.created_at)}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Recent trips */}
        {tab === 'trips' && (
          recentTrips.length === 0 ? (
            <p className="feed-empty">No recent trips</p>
          ) : recentTrips.map(t => (
            <div key={t.id} className="feed-row">
              <div className={`feed-row-dot ${t.status === 'completed' ? 'dot-completed' : t.status === 'ongoing' ? 'dot-ongoing' : 'dot-cancelled'}`} />
              <div className="feed-row-content">
                <p className="feed-row-title">
                  {t.passenger_name}
                  <span className="feed-row-route"> · {t.route_name}</span>
                </p>
                <p className="feed-row-sub">
                  {t.from_stop}<ArrowRight size={9} className="feed-sub-arrow" />{t.to_stop}
                </p>
              </div>
              <div className="feed-row-right">
                <span className="feed-fare">KSh {Number(t.fare).toLocaleString()}</span>
                <span className={`feed-pay-pill ${t.payment_status === 'paid' ? 'fpill-paid' : t.payment_status === 'cash_pending' ? 'fpill-cash' : 'fpill-unpaid'}`}>
                  {t.payment_status}
                </span>
                <span className="feed-time"><Clock size={9} strokeWidth={2} />{timeAgo(t.created_at)}</span>
              </div>
            </div>
          ))
        )}

        {/* Recent ratings */}
        {tab === 'ratings' && (
          recentRatings.length === 0 ? (
            <p className="feed-empty">No recent ratings</p>
          ) : recentRatings.map(r => (
            <div key={r.id} className="feed-row">
              <div className="feed-row-dot dot-rating" />
              <div className="feed-row-content">
                <p className="feed-row-title">
                  {r.passenger_name}
                  <span className="feed-row-route"> → {r.driver_name}</span>
                </p>
                {r.comment && <p className="feed-row-comment">"{r.comment}"</p>}
              </div>
              <div className="feed-row-right">
                <div className="feed-stars">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={10} strokeWidth={1.5}
                      className={i <= r.overall_score ? 'feed-star-lit' : 'feed-star-dim'}
                    />
                  ))}
                </div>
                <span className="feed-time"><Clock size={9} strokeWidth={2} />{timeAgo(r.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveActivityFeed;