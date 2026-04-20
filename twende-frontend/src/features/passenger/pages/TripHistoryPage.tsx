// src/features/passenger/pages/TripHistoryPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BusFront, Clock, MapPin, ChevronLeft,
  AlertCircle, ArrowRight, Star, CreditCard,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTripHistory, type Trip } from '../hooks/useTripHIstory';
import PaymentModal from '../components/PaymentModal';
import RatingModal from '../components/RatingModal';
import BottomNav from '../components/BottomNav';
import '../styles/tripHistoryPage.css';

// ── Status config — matches DB values ────────────────────────────────────────
const STATUS_CONFIG = {
  completed: {
    label: '✓ Completed',
    className: 'trip-status completed',
  },
  ongoing: {
    label: '● In Progress',
    className: 'trip-status ongoing',
  },
  cancelled: {
    label: '✕ Cancelled',
    className: 'trip-status cancelled',
  },
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

// ── Main page ─────────────────────────────────────────────────────────────────
const TripHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trips, loading, error, refresh, markPaid, submitRating } = useTripHistory();

  const [payTrip, setPayTrip] = useState<Trip | null>(null);
  const [rateTrip, setRateTrip] = useState<Trip | null>(null);

  const handlePaymentSuccess = async (trip: Trip) => {
    const toastId = toast.loading('Confirming payment…');
    try {
      await markPaid(trip.id);
      toast.success('Payment confirmed! Trip marked as complete. 🎉', {
        id: toastId, duration: 4000,
      });
    } catch {
      toast.error('Payment confirmed but sync failed. Pull to refresh.', { id: toastId });
    } finally {
      setPayTrip(null);
    }
  };

  const handleRatingSubmit = async (
    trip: Trip,
    scores: Parameters<typeof submitRating>[2]
  ) => {
    if (!trip.driverId) return;
    const toastId = toast.loading('Submitting your rating…');
    try {
      await submitRating(trip.id, trip.driverId, scores);
      toast.success('Thanks for rating your driver! ⭐', {
        id: toastId, duration: 4000,
      });
      setRateTrip(null);
    } catch {
      toast.error('Rating failed. Please try again.', { id: toastId });
    }
  };

  // Group by date
  const grouped = trips.reduce<Record<string, Trip[]>>((acc, trip) => {
    const key = formatDate(trip.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(trip);
    return acc;
  }, {});

  const ongoingCount = trips.filter(t => t.status === 'ongoing').length;

  return (
    <div className="trip-history-page pb-36">

      {/* ── HEADER ── */}
      <header className="trip-history-header">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              title="Go back"
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[#0B0F0D] dark:text-white font-black text-lg tracking-[-0.04em] uppercase">
                Trip History
              </span>
              {ongoingCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-black">
                  {ongoingCount}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-bold text-[#1D9E75] active:scale-95 disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            REFRESH
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* Greeting */}
        <div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
            {user?.name?.split(' ')[0] ?? 'Traveller'}
          </p>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-[-0.03em]">
            Your Journeys
          </h1>
        </div>

        {/* Ongoing banner */}
        {ongoingCount > 0 && (
          <div className="trip-pending-banner">
            <Clock size={18} className="text-amber-500 shrink-0" strokeWidth={2.5} />
            <div>
              <p className="font-black text-sm text-amber-700 dark:text-amber-300">
                {ongoingCount} trip{ongoingCount > 1 ? 's' : ''} awaiting payment
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                Tap "Pay with M-Pesa" to complete your trip
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-bold text-red-600 dark:text-red-400">Failed to load trips</p>
              <p className="text-sm text-red-500 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="trip-card h-44 animate-pulse" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="trip-empty py-20">
            <div className="trip-empty-icon mx-auto">
              <BusFront size={42} strokeWidth={1.5} />
            </div>
            <p className="font-black text-xl text-slate-700 dark:text-slate-300 mt-4">
              No trips yet
            </p>
            <p className="text-slate-400 dark:text-slate-500 mt-2 max-w-[260px] mx-auto">
              Your completed and cancelled matatu trips will appear here once you start riding.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dateLabel, dayTrips]) => (
              <div key={dateLabel}>
                <p className="trip-date-label">{dateLabel}</p>
                <div className="space-y-4">
                  {dayTrips.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onPay={() => setPayTrip(trip)}
                      onRate={() => setRateTrip(trip)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />

      {/* ── PAYMENT MODAL ── */}
      {payTrip && (
        <PaymentModal
          trip={payTrip}
          onClose={() => setPayTrip(null)}
          onSuccess={() => handlePaymentSuccess(payTrip)}
        />
      )}

      {/* ── RATING MODAL ── */}
      {rateTrip && rateTrip.driverId && (
        <RatingModal
          trip={rateTrip}
          driverId={rateTrip.driverId}
          onClose={() => setRateTrip(null)}
          onSubmit={scores => handleRatingSubmit(rateTrip, scores)}
        />
      )}
    </div>
  );
};

// ── Trip Card ─────────────────────────────────────────────────────────────────
const TripCard: React.FC<{
  trip: Trip;
  onPay: () => void;
  onRate: () => void;
}> = ({ trip, onPay, onRate }) => {
  const statusCfg = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.completed;

  // Pay button: only for ongoing trips
  const canPay = trip.status === 'ongoing';

  // Rate button: only for completed trips with a driver, not yet rated
  const canRate =
    trip.status === 'completed' &&
    !trip.wasRated &&
    !!trip.driverId;

  return (
    <div className={`trip-card ${trip.status === 'ongoing' ? 'trip-card-pending' : ''}`}>
      {/* Main body */}
      <div className="p-5 pb-3">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="trip-date">{formatDate(trip.date)}</p>
            <p className="trip-route mt-1">
              {trip.routeName || `${trip.from} → ${trip.to}`}
            </p>
          </div>
          <span className={statusCfg.className}>{statusCfg.label}</span>
        </div>

        {/* Route detail */}
        <div className="trip-detail-row">
          <div className="trip-icon">
            <MapPin size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              {trip.from}
              <ArrowRight size={14} className="inline mx-1 text-slate-400" />
              {trip.to}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {trip.time}{trip.duration && ` · ${trip.duration}`}
            </p>
          </div>
        </div>

        {/* Driver row */}
        {trip.driverName && (
          <div className="trip-driver-row">
            <div className="trip-driver-avatar">
              {trip.driverName[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                {trip.driverName}
              </p>
              {trip.matatuNumber && (
                <p className="text-[10px] text-slate-400">{trip.matatuNumber}</p>
              )}
            </div>
            {trip.driverRating !== undefined && (
              <div className="flex items-center gap-0.5">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {Number(trip.driverRating).toFixed(1)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="bottom-bar">
        <div>
          <p className="trip-fare">KSh {trip.fare?.toLocaleString() ?? '—'}</p>
          <p className="text-[10px] text-slate-400">
            {canPay ? 'Fare pending' : 'Fare paid'}
          </p>
        </div>

        <div className="flex flex-col gap-2 items-end">
          {canPay && (
            <button onClick={onPay} className="trip-action-btn trip-action-pay">
              <CreditCard size={14} strokeWidth={2.5} />
              Pay with M-Pesa
            </button>
          )}
          {canRate && (
            <button onClick={onRate} className="trip-action-btn trip-action-rate">
              <Star size={14} strokeWidth={2.5} />
              Rate Driver
            </button>
          )}
          {trip.wasRated && (
            <span className="trip-rated-badge">
              <Star size={11} className="fill-current" />
              Rated
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripHistoryPage;