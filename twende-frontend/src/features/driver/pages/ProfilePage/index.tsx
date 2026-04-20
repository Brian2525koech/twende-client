// src/features/driver/pages/ProfilePage/index.tsx
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BusFront, Sun, Moon, Camera, Edit3,
  Lock, Eye, EyeOff, X, Star,
  Route, Users, LogOut,
  TrendingUp, Bell,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useDriverProfile } from './useDriverProfile';
import ImageGallery from './ImageGallery';
import VehicleEditor from './VehicleEditor';
import RatingSummary from './RatingSummary';
import ReviewList from './ReviewList';
import DriverBottomNav from '../../components/DriverBottomNav';
import type { ModalType } from './types';
import './driverProfile.css';

// ════════════════════════════════════════
// MODAL
// ════════════════════════════════════════
interface ModalProps {
  type:          ModalType;
  displayName:   string;
  onClose:       () => void;
  onPhotoSelect: (file: File) => void;
  onNameSave:    (name: string) => Promise<void>;
  onPasswordSave:(current: string, next: string) => Promise<void>;
  uploading:     boolean;
}

const DriverModal: React.FC<ModalProps> = ({
  type, displayName, onClose,
  onPhotoSelect, onNameSave, onPasswordSave, uploading,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name,        setName]        = useState(displayName);
  const [currentPw,   setCurrentPw]   = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  if (!type) return null;

  const title =
    type === 'photo'    ? 'Update profile photo' :
    type === 'name'     ? 'Change display name' :
    type === 'password' ? 'Change password' : '';

  const handleNameSubmit = async () => {
    if (!name.trim()) return;
    setBusy(true); setError(null);
    try { await onNameSave(name.trim()); onClose(); }
    catch { setError('Could not update name'); }
    finally { setBusy(false); }
  };

  const handlePasswordSubmit = async () => {
    setError(null);
    if (newPw.length < 8)   { setError('New password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    if (!currentPw)          { setError('Enter your current password'); return; }
    setBusy(true);
    try { await onPasswordSave(currentPw, newPw); onClose(); }
    catch (e: any) { setError(e.message ?? 'Failed to change password'); }
    finally { setBusy(false); }
  };

  return (
    <div
      className="dp-modal-overlay"
      role="dialog"
      aria-modal
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="dp-modal-sheet">
        <div className="dp-modal-handle" />
        <div className="dp-modal-header">
          <h3 className="dp-modal-title">{title}</h3>
          <button onClick={onClose} className="dp-modal-close" aria-label="Close">
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {error && (
          <div className="dp-modal-error"><p>{error}</p></div>
        )}

        {type === 'photo' && (
          <div className="dp-modal-body">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="dp-hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) { onPhotoSelect(f); onClose(); }
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="dp-modal-submit"
            >
              <Camera size={16} strokeWidth={2.5} />
              {uploading ? 'Uploading…' : 'Choose from gallery'}
            </button>
            <button onClick={onClose} className="dp-modal-cancel">Cancel</button>
          </div>
        )}

        {type === 'name' && (
          <div className="dp-modal-body">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleNameSubmit(); }}
              placeholder="Your full name"
              maxLength={40}
              className="dp-input"
              autoFocus
            />
            <button
              onClick={handleNameSubmit}
              disabled={busy || !name.trim()}
              className="dp-modal-submit"
            >
              {busy ? 'Saving…' : 'Save name'}
            </button>
            <button onClick={onClose} className="dp-modal-cancel">Cancel</button>
          </div>
        )}

        {type === 'password' && (
          <div className="dp-modal-body">
            <div className="dp-pw-wrap">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Current password"
                title="Current password"
                className="dp-input dp-input-pr"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="dp-pw-eye"
                aria-label={showCurrent ? 'Hide' : 'Show'}
              >
                {showCurrent ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
              </button>
            </div>
            <div className="dp-pw-wrap">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="New password (min 8 chars)"
                title="New password"
                className="dp-input dp-input-pr"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="dp-pw-eye"
                aria-label={showNew ? 'Hide' : 'Show'}
              >
                {showNew ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
              </button>
            </div>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Confirm new password"
              className="dp-input"
            />
            <button
              onClick={handlePasswordSubmit}
              disabled={busy || !currentPw || !newPw || !confirmPw}
              className="dp-modal-submit"
            >
              {busy ? 'Changing…' : 'Change password'}
            </button>
            <button onClick={onClose} className="dp-modal-cancel">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════
const DriverProfilePage: React.FC = () => {
  const navigate                 = useNavigate();
  const { logout }               = useAuth();
  const { theme, toggleTheme }   = useTheme();
  const [modal, setModal]        = useState<ModalType>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const {
    data, loading, uploadingPhoto, uploadingImage,
    saveName, savePassword, saveAvatar,
    saveVehicle, saveAmenities,
    addMatatuImage, deleteMatatuImage, reorderImages,
  } = useDriverProfile();

  if (loading || !data) {
    return (
      <div className="dp-page">
        <div className="dp-loading">
          <div className="dp-loading-icon">
            <BusFront size={30} className="dp-loading-bus" strokeWidth={2} />
          </div>
          <p className="dp-loading-text">Loading profile…</p>
        </div>
      </div>
    );
  }

  // FIXED: Backend returns "ratings", not "reviews"
  // We alias it and give a safe default so ReviewList never gets undefined
  const { profile, images, ratings: reviews = [], breakdown } = data;

  const initials = profile.driver_name
    .split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-KE', {
    month: 'long', year: 'numeric',
  });

  return (
    <div className="dp-page">

      {/* ── HEADER ── */}
      <header className="dp-header">
        <div className="dp-header-inner">
          <div className="dp-logo">
            <div className="dp-logo-icon">
              <BusFront size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="dp-logo-text">
              TWENDE<span className="dp-logo-dot">.</span>
            </span>
          </div>
          <button onClick={toggleTheme} className="dp-icon-btn" aria-label="Toggle theme">
            {theme === 'dark'
              ? <Sun size={15} className="dp-sun-icon" />
              : <Moon size={15} className="dp-moon-icon" />
            }
          </button>
        </div>
      </header>

      <main className="dp-main">

        {/* ── HERO CARD ── */}
        <div className="dp-hero-card">
          {/* Profile image */}
          <div className="dp-hero-top">
            <button
              onClick={() => setModal('photo')}
              className="dp-avatar-wrapper"
              aria-label="Change photo"
            >
              <div className="dp-avatar-inner">
                {uploadingPhoto ? (
                  <div className="dp-avatar-spinner" />
                ) : profile.profile_image_url ? (
                  <img src={profile.profile_image_url} alt="Profile" className="dp-avatar-img" />
                ) : (
                  <span className="dp-avatar-initials">{initials}</span>
                )}
              </div>
              <div className="dp-avatar-badge">
                <Camera size={12} className="text-white" strokeWidth={2.5} />
              </div>
            </button>

            {/* Info */}
            <div className="dp-hero-info">
              <div className="dp-hero-badge-row">
                <span className="dp-role-badge">Driver</span>
                <span className={`dp-status-badge ${profile.is_active ? 'dp-status-on' : 'dp-status-off'}`}>
                  {profile.is_active ? '● Online' : '○ Offline'}
                </span>
              </div>

              <button
                onClick={() => setModal('name')}
                className="dp-name-btn"
                aria-label="Edit name"
              >
                <span className="dp-name-text">{profile.driver_name}</span>
                <Edit3 size={13} className="dp-name-edit-icon" strokeWidth={2.5} />
              </button>

              <p className="dp-email">{profile.email}</p>
              <div className="dp-member-row">
                <span className="dp-member-dot" />
                <span className="dp-member-text">Driver since {memberSince}</span>
              </div>
              {profile.city_name && (
                <p className="dp-city">{profile.city_name}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="dp-stats-row">
            <div className="dp-stat">
              <Route size={16} strokeWidth={2} className="dp-stat-icon" />
              <span className="dp-stat-val">{profile.total_trips.toLocaleString()}</span>
              <span className="dp-stat-lbl">Trips</span>
            </div>
            <div className="dp-stat-sep" />
            <div className="dp-stat">
              <Star size={16} strokeWidth={2} className="dp-stat-icon" />
              <span className="dp-stat-val">
                {profile.average_rating > 0 ? profile.average_rating.toFixed(1) : '—'}
              </span>
              <span className="dp-stat-lbl">Rating</span>
            </div>
            <div className="dp-stat-sep" />
            <div className="dp-stat">
              <Users size={16} strokeWidth={2} className="dp-stat-icon" />
              <span className="dp-stat-val">{profile.total_ratings}</span>
              <span className="dp-stat-lbl">Reviews</span>
            </div>
            <div className="dp-stat-sep" />
            <div className="dp-stat">
              <TrendingUp size={16} strokeWidth={2} className="dp-stat-icon" />
              <span className="dp-stat-val">{profile.capacity}</span>
              <span className="dp-stat-lbl">Capacity</span>
            </div>
          </div>
        </div>

        {/* ── ROUTE INFO ── */}
        {profile.route_name && (
          <div className="dp-route-card">
            <div
              className="dp-route-colour-dot"
              style={{ background: profile.route_colour ?? '#1D9E75' }}
            />
            <div>
              <p className="dp-route-name">{profile.route_name}</p>
              {profile.city_name && (
                <p className="dp-route-city">{profile.city_name}</p>
              )}
            </div>
            <button
              onClick={() => navigate('/driver/map')}
              className="dp-route-map-btn"
            >
              View on Map
            </button>
          </div>
        )}

        {/* ── MATATU IMAGES ── */}
        <ImageGallery
          images={images}
          uploading={uploadingImage}
          onAdd={addMatatuImage}
          onDelete={deleteMatatuImage}
          onReorder={reorderImages}
        />

        {/* ── VEHICLE & AMENITIES ── */}
        <VehicleEditor
          profile={profile}
          onSave={saveVehicle}
          onAmenities={saveAmenities}
        />

        {/* ── RATING SUMMARY ── */}
        <RatingSummary profile={profile} breakdown={breakdown} />

        {/* ── REVIEWS ── */}
        <ReviewList reviews={reviews} />

        {/* ── ACCOUNT ACTIONS ── */}
        <div className="dp-card">
          <p className="dp-card-title">Account</p>
          <div className="dp-action-list">
            <button
              onClick={() => setModal('password')}
              className="dp-action-row"
            >
              <div className="dp-action-icon dp-action-icon-default">
                <Lock size={15} strokeWidth={2} />
              </div>
              <div className="dp-action-text">
                <p className="dp-action-label">Change password</p>
                <p className="dp-action-desc">Update your account password</p>
              </div>
            </button>
            <div className="dp-divider" />
            <button
              onClick={() => navigate('/driver/notifications')}
              className="dp-action-row"
            >
              <div className="dp-action-icon dp-action-icon-default">
                <Bell size={15} strokeWidth={2} />
              </div>
              <div className="dp-action-text">
                <p className="dp-action-label">Notifications</p>
                <p className="dp-action-desc">Manage alerts and push notifications</p>
              </div>
            </button>
            <div className="dp-divider" />
            {showLogoutConfirm ? (
              <div className="dp-logout-confirm">
                <p className="dp-logout-confirm-text">Sign out of Twende?</p>
                <div className="dp-logout-actions">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="dp-logout-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="dp-logout-btn"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="dp-action-row dp-action-row-danger"
              >
                <div className="dp-action-icon dp-action-icon-danger">
                  <LogOut size={15} strokeWidth={2} />
                </div>
                <div className="dp-action-text">
                  <p className="dp-action-label dp-label-danger">Sign out</p>
                  <p className="dp-action-desc">You can sign back in anytime</p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="dp-footer">
          <div className="dp-footer-brand">
            <div className="dp-footer-icon">
              <BusFront size={11} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="dp-footer-name">TWENDE</span>
          </div>
          <p className="dp-footer-tag">Made with ❤️ in Kenya</p>
        </footer>

        <div className="dp-bottom-spacer" />
      </main>

      {/* ── MODAL ── */}
      {modal && (
        <DriverModal
          type={modal}
          displayName={profile.driver_name}
          onClose={() => setModal(null)}
          onPhotoSelect={saveAvatar}
          onNameSave={saveName}
          onPasswordSave={savePassword}
          uploading={uploadingPhoto}
        />
      )}

      <DriverBottomNav />
    </div>
  );
};

export default DriverProfilePage;