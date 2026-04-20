// src/features/passenger/components/RouteCard.tsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Star, Navigation, Users, Clock } from 'lucide-react';
import FavouriteButton from './FavouriteButton';
import type { Route } from '@/types';

interface RouteCardProps {
  route: Route;
  isFavourited: boolean;
  onFavouriteToggle: (routeId: number, isFav: boolean) => void;
}

const RouteCard: React.FC<RouteCardProps> = ({
  route,
  isFavourited,
  onFavouriteToggle,
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.setProperty('--rc-color', route.colour || '#1D9E75');
    }
  }, [route.colour]);

  const handleTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/map/${route.id}`);
  };

  const activeDrivers = Number(route.active_drivers ?? 0);
  const avgRating = route.average_rating != null
    ? Number(route.average_rating)
    : null;

  return (
    <div
      ref={cardRef}
      onClick={() => navigate(`/map/${route.id}`)}
      className="route-card-context group relative bg-white dark:bg-[#111816] border border-slate-100 dark:border-white/[0.05] rounded-[1.5rem] overflow-hidden cursor-pointer active:scale-[0.985] transition-all duration-200"
    >
      {/* Color strip at top */}
      <div className="dynamic-route-strip absolute top-0 left-0 right-0 h-[3px]" />

      <div className="p-4 flex flex-col gap-3.5 pt-5">

        {/* ── Row 1: Icon + Name + Favourite ──────────────────────────── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="dynamic-route-bg w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0">
              <Bus size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight truncate">
                {route.name}
              </h3>
              {route.description && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 leading-snug line-clamp-1">
                  {route.description}
                </p>
              )}
              {route.city_name && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-slate-300 dark:text-slate-600 mt-0.5">
                  {route.city_name}
                </span>
              )}
            </div>
          </div>

          <FavouriteButton
            routeId={route.id}
            initialFavourited={isFavourited}
            onToggle={onFavouriteToggle}
          />
        </div>

        {/* ── Row 2: Stats pills ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live drivers pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
            activeDrivers > 0
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-slate-50 dark:bg-white/[0.03] border-slate-100 dark:border-white/[0.05] text-slate-400 dark:text-slate-500'
          }`}>
            {activeDrivers > 0 && (
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            )}
            <Users size={11} strokeWidth={2.5} />
            <span>
              {activeDrivers > 0 ? `${activeDrivers} online` : 'No drivers'}
            </span>
          </div>

          {/* Rating pill */}
          {avgRating !== null && avgRating > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
              <Star size={11} className="fill-amber-500 text-amber-500" strokeWidth={2} />
              <span>{avgRating.toFixed(1)}</span>
            </div>
          )}

          {/* ETA pill — only when drivers are online */}
          {activeDrivers > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-400">
              <Clock size={11} strokeWidth={2.5} />
              <span>Live tracking</span>
            </div>
          )}
        </div>

        {/* ── Row 3: Track button ──────────────────────────────────────── */}
        <button
          onClick={handleTrack}
          className="dynamic-track-btn w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200"
        >
          <Navigation size={14} strokeWidth={2.5} />
          Track Route
        </button>
      </div>
    </div>
  );
};

export default RouteCard;