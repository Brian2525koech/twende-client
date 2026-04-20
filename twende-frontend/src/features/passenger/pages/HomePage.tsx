// src/features/passenger/pages/HomePage.tsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BusFront,
  Sun,
  Moon,
  User,
  ChevronRight,
  MapPin,
  Zap,
  AlertCircle,
  RefreshCw,
  Route,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePassengerRoutes } from '../hooks/usePassengerRoutes';
import RouteCard from '../components/RouteCard';
import SearchBar from '../components/SearchBar';
import BottomNav from '../components/BottomNav';
import '../styles/homepage.css';

const RouteCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-[#111816] border border-slate-100 dark:border-white/[0.05] rounded-[1.5rem] p-4 flex flex-col gap-4">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl skeleton-wave" />
        <div className="space-y-2">
          <div className="h-4 w-32 rounded-lg skeleton-wave" />
          <div className="h-3 w-20 rounded-lg skeleton-wave" />
        </div>
      </div>
      <div className="w-9 h-9 rounded-xl skeleton-wave" />
    </div>
    <div className="flex gap-4">
      <div className="h-3 w-16 rounded-lg skeleton-wave" />
      <div className="h-3 w-12 rounded-lg skeleton-wave" />
    </div>
    <div className="h-11 w-full rounded-xl skeleton-wave" />
  </div>
);

const EmptyState: React.FC<{ query: string }> = ({ query }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-16 h-16 rounded-[1.25rem] bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mb-4">
      <MapPin size={28} className="text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
    </div>
    <p className="font-extrabold text-slate-700 dark:text-slate-300 text-base mb-1">
      {query ? `No results for "${query}"` : 'No routes available'}
    </p>
    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium max-w-[200px] leading-relaxed">
      {query
        ? 'Try a different route name or destination.'
        : 'Check back soon for routes in your area.'}
    </p>
  </div>
);

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { routes, favouriteIds, loading, error, toggleFavourite } = usePassengerRoutes();
  const [searchQuery, setSearchQuery] = useState('');

  const firstName = user?.name?.split(' ')[0] ?? 'Traveller';
  const initials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'U';

  const filteredRoutes = useMemo(
    () =>
      routes.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [routes, searchQuery]
  );

  const favouriteRoutes = useMemo(
    () => filteredRoutes.filter((r) => favouriteIds.has(r.id)),
    [filteredRoutes, favouriteIds]
  );

  const otherRoutes = useMemo(
    () => filteredRoutes.filter((r) => !favouriteIds.has(r.id)),
    [filteredRoutes, favouriteIds]
  );

  const totalOnline = useMemo(
    () => routes.reduce((acc, r) => acc + Number(r.active_drivers ?? 0), 0),
    [routes]
  );

  const userCity = routes[0]?.city_name ?? 'Kenya';

  return (
    <div className="min-h-screen bg-[#F6F7F5] dark:bg-[#0B0F0D] transition-colors duration-300 pb-36">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#F6F7F5]/90 dark:bg-[#0B0F0D]/90 backdrop-blur-xl border-b border-black/[0.04] dark:border-white/[0.04] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#1D9E75] rounded-[0.75rem] flex items-center justify-center shadow-md shadow-[#1D9E75]/30">
              <BusFront size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[#0B0F0D] dark:text-white font-black text-lg tracking-[-0.04em] uppercase">
              TWENDE<span className="text-[#1D9E75]">.</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl bg-black/[0.05] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'dark'
                ? <Sun size={15} className="text-amber-400" />
                : <Moon size={15} className="text-slate-500" />
              }
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-xl bg-[#1D9E75]/10 dark:bg-[#1D9E75]/15 border border-[#1D9E75]/20 dark:border-[#1D9E75]/20 flex items-center justify-center transition-all hover:bg-[#1D9E75]/20"
              aria-label="Profile"
            >
              <span className="text-[#1D9E75] text-xs font-black">{initials}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* ── GREETING ────────────────────────────────────────────────────── */}
        <div>
          <p className="greeting-label text-slate-400 dark:text-slate-500 mb-0.5">
            Good {getGreeting()}
          </p>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-[-0.03em]">
            {firstName} 👋
          </h1>
        </div>

        {/* ── STATS STRIP ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            {
              icon: Route,
              value: loading ? '—' : `${routes.length}`,
              label: 'Routes',
              color: 'text-[#1D9E75]',
            },
            {
              icon: Zap,
              value: loading ? '—' : `${totalOnline}`,
              label: 'Live Now',
              color: 'text-amber-500',
            },
            {
              icon: MapPin,
              value: loading ? '—' : userCity.slice(0, 3).toUpperCase(),
              label: 'City',
              color: 'text-blue-500',
            },
          ].map(({ icon: Icon, value, label, color }) => (
            <div
              key={label}
              className="stat-card bg-white dark:bg-[#111816] border border-slate-100 dark:border-white/[0.05] rounded-2xl px-3 py-3.5 flex flex-col items-center gap-1.5 shadow-sm"
            >
              <Icon size={16} className={color} strokeWidth={2.5} />
              <span className="stat-value text-slate-900 dark:text-white">
                {value}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── PROMO BANNER ────────────────────────────────────────────────── */}
        <div
          onClick={() => {
            if (routes.length > 0) navigate(`/map/${routes[0].id}`);
          }}
          className="promo-banner relative bg-gradient-to-br from-[#1D9E75] to-[#0F6E56] rounded-[1.75rem] px-6 py-5 text-white cursor-pointer active:scale-[0.98] transition-transform shadow-xl shadow-[#1D9E75]/25"
        >
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/[0.06] rounded-full pointer-events-none" />
          <div className="absolute right-4 -bottom-2 w-24 h-24 bg-white/[0.04] rounded-full pointer-events-none" />
          <BusFront
            size={72}
            className="absolute right-5 bottom-1 text-white/[0.10] pointer-events-none"
            strokeWidth={1.5}
          />
          <div className="relative z-10 max-w-[62%]">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60 mb-1">
              Live GPS · {userCity}
            </p>
            <h3 className="text-lg font-black leading-snug mb-3">
              Track matatus in real-time
            </h3>
            <span className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors">
              Explore routes
              <ChevronRight size={12} strokeWidth={3} />
            </span>
          </div>
        </div>

        {/* ── SEARCH ──────────────────────────────────────────────────────── */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* ── ERROR ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl px-4 py-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs font-bold text-red-400 flex items-center gap-1 mt-1 hover:text-red-500 transition-colors"
              >
                <RefreshCw size={11} strokeWidth={3} />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── FAVOURITES SECTION ──────────────────────────────────────────── */}
        {!loading && !searchQuery && favouriteRoutes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 px-0.5">
              <h2 className="section-heading text-base text-slate-900 dark:text-white">
                Your Favourites
              </h2>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-full">
                {favouriteRoutes.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {favouriteRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  isFavourited={true}
                  onFavouriteToggle={toggleFavourite}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── ALL ROUTES SECTION ──────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2 className="section-heading text-base text-slate-900 dark:text-white">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : favouriteRoutes.length > 0
                ? 'All Routes'
                : 'Routes Near You'}
            </h2>
            {!loading && !searchQuery && (
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-full">
                {routes.length}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {loading ? (
              [1, 2, 3].map((i) => <RouteCardSkeleton key={i} />)
            ) : filteredRoutes.length === 0 ? (
              <EmptyState query={searchQuery} />
            ) : searchQuery ? (
              filteredRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  isFavourited={favouriteIds.has(route.id)}
                  onFavouriteToggle={toggleFavourite}
                />
              ))
            ) : (
              otherRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  isFavourited={false}
                  onFavouriteToggle={toggleFavourite}
                />
              ))
            )}
          </div>
        </div>

      </main>

      <BottomNav />
    </div>
  );
};

export default HomePage;