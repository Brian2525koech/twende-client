// src/features/admin/pages/PassengersPage/PassengerTable.tsx
import React from 'react';
import { Search, Users, Star, TrendingUp, MapPin } from 'lucide-react';
import type { PassengerRow } from './types';
import { timeAgo } from './types';

interface Props {
  passengers: PassengerRow[];
  search:     string;
  onSearch:   (v: string) => void;
}

const PassengerTable: React.FC<Props> = ({ passengers, search, onSearch }) => {
  const filtered = passengers.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.city_name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="pass-table-wrap">
      {/* Search bar */}
      <div className="pass-search-row">
        <div className="pass-search-box">
          <Search size={13} strokeWidth={2.5} className="pass-search-icon" />
          <input
            className="pass-search-input"
            placeholder="Search passengers by name, email or city…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <span className="pass-total-badge">{filtered.length} passengers</span>
      </div>

      {/* Table / list */}
      {filtered.length === 0 ? (
        <div className="pass-empty">
          <Users size={28} strokeWidth={1.3} className="pass-empty-icon" />
          <p className="pass-empty-title">No passengers found</p>
          <p className="pass-empty-sub">Try adjusting your search</p>
        </div>
      ) : (
        <div className="pass-list">
          {filtered.map((p) => (
            <div key={p.id} className="pass-list-row">
              {/* Avatar */}
              <div className="pass-list-avatar">
                {p.profile_image_url ? (
                  <img
                    src={p.profile_image_url}
                    alt={p.name}
                    className="pass-avatar-img"
                  />
                ) : (
                  <span className="pass-avatar-initial">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="pass-list-info">
                <p className="pass-list-name">{p.name}</p>
                <p className="pass-list-email">{p.email}</p>
                <div className="pass-list-meta-row">
                  <MapPin size={9} strokeWidth={2.5} className="pass-meta-icon" />
                  <span className="pass-list-city">{p.city_name ?? '—'}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="pass-list-stats">
                <div className="pass-list-stat">
                  <TrendingUp size={10} strokeWidth={2.5} className="pass-stat-icon-blue" />
                  <span className="pass-stat-val">{p.total_trips}</span>
                  <span className="pass-stat-lbl">trips</span>
                </div>
                <div className="pass-list-stat">
                  <Star size={10} strokeWidth={2.5} className="pass-stat-icon-amber" />
                  <span className="pass-stat-val">{p.total_ratings}</span>
                  <span className="pass-stat-lbl">ratings</span>
                </div>
                <p className="pass-member-since">
                  Joined {timeAgo(p.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PassengerTable;