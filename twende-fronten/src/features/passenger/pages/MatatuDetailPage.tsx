// src/features/passenger/components/MatatuImageSlider.tsx

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Star,
  Users,
  MapPin,
  Calendar,
  Palette,
  Navigation,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  User,
  Sun,
  Moon,
  AlertCircle,
  BusFront,
  Zap,
  Route,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useMatatuDetail } from '../hooks/useMatatuDetail'
import MatatuImageSlider from '../components/MatatuImageSlider'
import MatatuRatingBreakdown from '../components/MatatuRatingBreakdown'
import MatatuReviewCard from '../components/MatatuReviewCard'
import MatatuAmenityBadge from '../components/MatatuAmenityBadge'
import MatatuStopList from '../components/MatatuStopList'
import '../styles/matatu-detail.css'

const SectionCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white dark:bg-[#111816] border border-slate-100 dark:border-white/[0.05] rounded-[1.5rem] overflow-hidden shadow-sm">
    {children}
  </div>
)

const SectionHeader: React.FC<{
  icon: React.ReactNode
  title: string
  count?: number
}> = ({ icon, title, count }) => (
  <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-50 dark:border-white/[0.04]">
    <div className="w-7 h-7 rounded-lg bg-[#1D9E75]/10 dark:bg-[#1D9E75]/20 flex items-center justify-center shrink-0">
      <div className="text-[#1D9E75]">{icon}</div>
    </div>
    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex-1 tracking-tight">
      {title}
    </h2>
    {count !== undefined && (
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-full uppercase tracking-wide">
        {count}
      </span>
    )}
  </div>
)

const PageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#F6F7F5] dark:bg-[#0B0F0D] pb-10">
    <div className="md-skeleton h-[280px] rounded-none" />
    <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
      <div className="md-skeleton h-7 w-44 rounded-xl" />
      <div className="md-skeleton h-4 w-28 rounded-lg" />
      <div className="grid grid-cols-4 gap-2">
        {[1,2,3,4].map(i => <div key={i} className="md-skeleton h-14 rounded-2xl" />)}
      </div>
      <div className="md-skeleton h-28 rounded-2xl" />
      <div className="md-skeleton h-40 rounded-2xl" />
      <div className="md-skeleton h-56 rounded-2xl" />
    </div>
  </div>
)

const MatatuDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const {
    matatu, images, stops, reviews,
    ratingBreakdown, loading, error,
  } = useMatatuDetail(id)

  const [showAllReviews, setShowAllReviews] = useState(false)
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  if (loading) return <PageSkeleton />

  if (error || !matatu) return (
    <div className="min-h-screen bg-[#F6F7F5] dark:bg-[#0B0F0D] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="w-16 h-16 rounded-[1.25rem] bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
        <AlertCircle size={28} className="text-red-400" strokeWidth={1.5} />
      </div>
      <p className="font-extrabold text-slate-800 dark:text-slate-200 text-base">
        {error ?? 'Matatu not found'}
      </p>
      <button
        onClick={() => navigate(-1)}
        className="px-5 py-2.5 bg-[#1D9E75] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#1D9E75]/25"
      >
        Go back
      </button>
    </div>
  )

  const vehicleLabel = [matatu.vehicle_year, matatu.vehicle_make, matatu.vehicle_model]
    .filter(Boolean).join(' ')

  const driverInitials = matatu.driver_name
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const memberYear = new Date(matatu.driver_since).getFullYear()
  const isOnline = matatu.is_active

  return (
    <div className="min-h-screen bg-[#F6F7F5] dark:bg-[#0B0F0D] pb-10">

      {/* ── SLIDER ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <MatatuImageSlider
          images={images}
          plateNumber={matatu.plate_number}
          vehicleColour={matatu.vehicle_colour}
          routeColour={matatu.route_colour}
          onBack={() => navigate(-1)}
        />

        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/30 border border-white/20 backdrop-blur-md flex items-center justify-center z-20 transition-all hover:bg-black/50"
          aria-label="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun size={14} className="text-amber-400" />
            : <Moon size={14} className="text-white" />
          }
        </button>

        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border ${
            isOnline
              ? 'bg-emerald-500/80 border-emerald-400/40 text-white'
              : 'bg-black/40 border-white/10 text-white/70'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-white online-dot' : 'bg-white/50'}`} />
            {isOnline ? 'Online now' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* ── IDENTITY ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {matatu.plate_number}
            </h1>
            {vehicleLabel && (
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                {vehicleLabel}
              </p>
            )}
            <button
              onClick={() => navigate(`/map/${matatu.route_id}`)}
              className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all hover:opacity-80 active:scale-[0.97]"
              style={{
                backgroundColor: `${matatu.route_colour}12`,
                borderColor: `${matatu.route_colour}28`,
              }}
            >
              <Route
                size={11}
                strokeWidth={2.5}
                style={{ color: matatu.route_colour }}
              />
              <span
                className="text-xs font-bold"
                style={{ color: matatu.route_colour }}
              >
                {matatu.route_name}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                · {matatu.city_name}
              </span>
            </button>
          </div>

          {matatu.average_rating > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl px-3 py-2.5 shrink-0">
              <Star size={15} className="fill-amber-400 text-amber-400" strokeWidth={2} />
              <span className="text-lg font-black text-amber-700 dark:text-amber-400 leading-none">
                {matatu.average_rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* ── STATS ───────────────────────────────────────────────────────── */}
        <SectionCard>
          <div className="flex divide-x divide-slate-100 dark:divide-white/[0.04] py-4">
            {[
              {
                icon: <Star size={14} className="fill-amber-400 text-amber-400" strokeWidth={2} />,
                value: matatu.average_rating > 0 ? matatu.average_rating.toFixed(1) : '—',
                label: 'Rating',
              },
              {
                icon: <MessageSquare size={14} className="text-[#1D9E75]" strokeWidth={2.5} />,
                value: matatu.total_ratings,
                label: 'Reviews',
              },
              {
                icon: <BusFront size={14} className="text-blue-500" strokeWidth={2.5} />,
                value: matatu.total_trips,
                label: 'Trips',
              },
              {
                icon: <Users size={14} className="text-slate-400 dark:text-slate-500" strokeWidth={2.5} />,
                value: matatu.capacity,
                label: 'Seats',
              },
            ].map(({ icon, value, label }) => (
              <div key={label} className="matatu-stat-col">
                {icon}
                <span className="matatu-stat-num text-slate-900 dark:text-white">{value}</span>
                <span className="matatu-stat-lbl text-slate-400 dark:text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── DRIVER ──────────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<User size={13} strokeWidth={2.5} />}
            title="Your Driver"
          />
          <div className="flex items-center gap-4 p-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1D9E75]/10 dark:bg-[#1D9E75]/20 border-2 border-[#1D9E75]/20 flex items-center justify-center shrink-0 overflow-hidden">
              {matatu.driver_image_url ? (
                <img
                  src={matatu.driver_image_url}
                  alt={matatu.driver_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-black text-[#1D9E75]">
                  {driverInitials}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-slate-900 dark:text-white text-base leading-none">
                {matatu.driver_name}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Calendar size={11} className="text-slate-400" strokeWidth={2.5} />
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Since {memberYear}
                </span>
              </div>
              {matatu.vehicle_colour && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Palette size={11} className="text-slate-400" strokeWidth={2.5} />
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {matatu.vehicle_colour} matatu
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1">
                <Star size={13} className="fill-amber-400 text-amber-400" strokeWidth={2} />
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                  {matatu.average_rating.toFixed(1)}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {matatu.total_ratings} ratings
              </span>
            </div>
          </div>
        </SectionCard>

        {/* ── AMENITIES ───────────────────────────────────────────────────── */}
        {matatu.amenities?.length > 0 && (
          <SectionCard>
            <SectionHeader
              icon={<Zap size={13} strokeWidth={2.5} />}
              title="Amenities"
              count={matatu.amenities.length}
            />
            <div className="flex flex-wrap gap-2 p-4">
              {matatu.amenities.map(a => (
                <MatatuAmenityBadge key={a} amenity={a} />
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── STOPS ───────────────────────────────────────────────────────── */}
        {stops.length > 0 && (
          <SectionCard>
            <SectionHeader
              icon={<MapPin size={13} strokeWidth={2.5} />}
              title="Route Stops"
              count={stops.length}
            />
            <div className="px-4 py-4">
              <MatatuStopList stops={stops} routeColour={matatu.route_colour} />
            </div>
          </SectionCard>
        )}

        {/* ── RATINGS & REVIEWS ───────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<Star size={13} strokeWidth={2.5} />}
            title="Ratings & Reviews"
            count={reviews.length || undefined}
          />

          <div className="p-4">
            {ratingBreakdown && matatu.total_ratings > 0 ? (
              <MatatuRatingBreakdown
                breakdown={ratingBreakdown}
                totalRatings={matatu.total_ratings}
                averageRating={matatu.average_rating}
              />
            ) : (
              <div className="flex flex-col items-center py-8 gap-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center">
                  <Star size={22} className="text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  No ratings yet
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Be the first to rate this matatu
                </p>
              </div>
            )}
          </div>

          {reviews.length > 0 && (
            <>
              <div className="border-t border-slate-50 dark:border-white/[0.04]" />
              <div className="p-4">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  Passenger Reviews
                </p>
                <div className="flex flex-col gap-3">
                  {visibleReviews.map(r => (
                    <MatatuReviewCard key={r.id} review={r} />
                  ))}
                </div>
                {reviews.length > 3 && (
                  <button
                    onClick={() => setShowAllReviews(v => !v)}
                    className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.06] text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    {showAllReviews ? (
                      <><ChevronUp size={14} strokeWidth={2.5} /> Show less</>
                    ) : (
                      <><ChevronDown size={14} strokeWidth={2.5} /> Show all {reviews.length} reviews</>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </SectionCard>

        {/* ── TRACK BUTTON ────────────────────────────────────────────────── */}
        <button
          onClick={() => navigate(`/map/${matatu.route_id}`)}
          className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 text-white transition-all active:scale-[0.98]"
          style={{
            backgroundColor: matatu.route_colour,
            boxShadow: `0 8px 24px ${matatu.route_colour}40`,
          }}
        >
          <Navigation size={18} strokeWidth={2.5} />
          Track this matatu live
        </button>

      </div>
    </div>
  )
}

export default MatatuDetailPage