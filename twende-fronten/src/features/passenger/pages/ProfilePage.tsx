// src/features/passenger/pages/ProfilePage.tsx
// Passenger-only profile page.
// - Stats come from passenger trip/rating/favourites counts (NOT driver data)
// - Role is always shown as "Passenger"
// - All API calls go to /api/passenger/profile/*
// - Uses react-hot-toast exclusively (no custom saveToast overlay)
// - No driver-related fields anywhere

import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BusFront, Sun, Moon, ChevronRight,
  Camera, User, Bell, Shield, HelpCircle,
  LogOut, Star, Heart, Edit3, X,
  Smartphone, Globe, Lock, Trash2, Info,
  Eye, EyeOff, Route,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useProfile } from '../hooks/useProfile'
import BottomNav from '../components/BottomNav'
import '../styles/profile.css'

type ModalType = 'photo' | 'name' | 'password' | 'city' | null

// ════════════════════════════════════════
// MODAL
// ════════════════════════════════════════
interface ModalProps {
  type:             ModalType
  displayName:      string
  onClose:          () => void
  onPhotoSelect:    (file: File) => void
  onNameSave:       (name: string) => Promise<void>
  onPasswordSave:   (current: string, next: string) => Promise<void>
  uploadingPhoto:   boolean
  cityName:         string
}

const ProfileModal: React.FC<ModalProps> = ({
  type, displayName, onClose,
  onPhotoSelect, onNameSave, onPasswordSave,
  uploadingPhoto, cityName,
}) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const [name,        setName]        = useState(displayName)
  const [currentPw,   setCurrentPw]   = useState('')
  const [newPw,       setNewPw]       = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [busy,        setBusy]        = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  if (!type) return null

  const handleNameSubmit = async () => {
    if (!name.trim()) return
    setBusy(true); setError(null)
    try { await onNameSave(name.trim()); onClose() }
    catch { setError('Could not update name') }
    finally { setBusy(false) }
  }

  const handlePasswordSubmit = async () => {
    setError(null)
    if (newPw.length < 8)        { setError('New password must be at least 8 characters'); return }
    if (newPw !== confirmPw)     { setError('Passwords do not match'); return }
    if (!currentPw)              { setError('Enter your current password'); return }
    setBusy(true)
    try { await onPasswordSave(currentPw, newPw); onClose() }
    catch (e: any) { setError(e.message ?? 'Failed to change password') }
    finally { setBusy(false) }
  }

  const title =
    type === 'photo'    ? 'Update profile photo' :
    type === 'name'     ? 'Change your name' :
    type === 'password' ? 'Change password' :
    'City'

  return (
    <div
      className="profile-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="profile-modal-sheet">

        <div className="profile-modal-handle" />

        <div className="profile-modal-header">
          <h3 className="profile-modal-title">{title}</h3>
          <button
            onClick={onClose}
            className="profile-modal-close"
            aria-label="Close"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {error && (
          <div className="profile-modal-error">
            <p>{error}</p>
          </div>
        )}

        {/* ── Photo ── */}
        {type === 'photo' && (
          <div className="profile-modal-body">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="profile-hidden-file"
              aria-label="Select profile photo"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) { onPhotoSelect(f); onClose() }
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="profile-modal-submit"
            >
              <Camera size={16} strokeWidth={2.5} />
              {uploadingPhoto ? 'Uploading…' : 'Choose from gallery'}
            </button>
            <button onClick={onClose} className="profile-modal-cancel">
              Cancel
            </button>
          </div>
        )}

        {/* ── Name ── */}
        {type === 'name' && (
          <div className="profile-modal-body">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleNameSubmit() }}
              placeholder="Your full name"
              maxLength={40}
              className="profile-modal-input"
              autoFocus
            />
            <button
              onClick={handleNameSubmit}
              disabled={busy || !name.trim()}
              className="profile-modal-submit"
            >
              {busy ? 'Saving…' : 'Save name'}
            </button>
            <button onClick={onClose} className="profile-modal-cancel">Cancel</button>
          </div>
        )}

        {/* ── Password ── */}
        {type === 'password' && (
          <div className="profile-modal-body">
            <div className="profile-pw-field">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Current password"
                className="profile-modal-input"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="profile-pw-eye"
                aria-label={showCurrent ? 'Hide' : 'Show'}
              >
                {showCurrent ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
              </button>
            </div>
            <div className="profile-pw-field">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="profile-modal-input"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="profile-pw-eye"
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
              className="profile-modal-input"
            />
            <button
              onClick={handlePasswordSubmit}
              disabled={busy || !currentPw || !newPw || !confirmPw}
              className="profile-modal-submit"
            >
              {busy ? 'Changing…' : 'Change password'}
            </button>
            <button onClick={onClose} className="profile-modal-cancel">Cancel</button>
          </div>
        )}

        {/* ── City (info only — passengers don't self-select city) ── */}
        {type === 'city' && (
          <div className="profile-modal-body">
            <p className="profile-modal-info-text">
              Your city is set to <strong>{cityName}</strong> based on your registration.
              Contact Twende support to update your city.
            </p>
            <button onClick={onClose} className="profile-modal-submit">Got it</button>
          </div>
        )}

      </div>
    </div>
  )
}

// ════════════════════════════════════════
// SMALL REUSABLE PIECES
// ════════════════════════════════════════

const Avatar: React.FC<{
  src: string | null
  initials: string
  uploading: boolean
  onClick: () => void
}> = ({ src, initials, uploading, onClick }) => (
  <button
    className="profile-avatar-wrapper"
    onClick={onClick}
    aria-label="Change profile picture"
  >
    <div className="profile-avatar-inner">
      {uploading ? (
        <div className="profile-avatar-spinner" />
      ) : src ? (
        <img src={src} alt="Profile" className="profile-avatar-img" />
      ) : (
        <span className="profile-avatar-initials">{initials}</span>
      )}
    </div>
    <div className="profile-avatar-badge">
      <Camera size={12} className="text-white" strokeWidth={2.5} />
    </div>
  </button>
)

const StatChip: React.FC<{
  icon: React.ReactNode
  value: string
  label: string
}> = ({ icon, value, label }) => (
  <div className="profile-stat-chip">
    <div className="profile-stat-icon">{icon}</div>
    <span className="profile-stat-value">{value}</span>
    <span className="profile-stat-label">{label}</span>
  </div>
)

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <p className="profile-section-label">{label}</p>
)

const SettingsCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="profile-settings-card">{children}</div>
)

const Divider: React.FC = () => (
  <div className="profile-divider" />
)

// Toggle — standalone, never nested in a <button>
const Toggle: React.FC<{
  enabled: boolean
  onChange: (val: boolean) => void
  label: string
}> = ({ enabled, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    onClick={e => { e.stopPropagation(); onChange(!enabled) }}
    className={`profile-toggle ${enabled ? 'profile-toggle-on' : 'profile-toggle-off'}`}
  >
    <span className={`profile-toggle-thumb ${enabled ? 'profile-toggle-thumb-on' : ''}`} />
  </button>
)

// Row with a chevron (or custom right element) — no interactive children inside
const RowBtn: React.FC<{
  icon: React.ReactNode
  label: string
  description?: string
  destructive?: boolean
  onClick: () => void
  right?: React.ReactNode
}> = ({ icon, label, description, destructive, onClick, right }) => (
  <button
    onClick={onClick}
    className={`profile-settings-row-btn ${destructive ? 'profile-row-destructive' : ''}`}
  >
    <div className={`profile-settings-icon ${destructive ? 'profile-icon-destructive' : 'profile-icon-default'}`}>
      <div className={destructive ? 'profile-icon-red' : 'profile-icon-muted'}>{icon}</div>
    </div>
    <div className="profile-row-text">
      <p className={`profile-row-label ${destructive ? 'profile-label-destructive' : ''}`}>{label}</p>
      {description && <p className="profile-row-desc">{description}</p>}
    </div>
    {right ?? (
      <ChevronRight
        size={15}
        strokeWidth={2.5}
        className={destructive ? 'profile-chevron-destructive' : 'profile-chevron'}
      />
    )}
  </button>
)

// Row with a toggle or other interactive right element — uses <div> not <button>
const RowDiv: React.FC<{
  icon: React.ReactNode
  label: string
  description?: string
  right: React.ReactNode
}> = ({ icon, label, description, right }) => (
  <div className="profile-settings-row-div">
    <div className="profile-settings-icon profile-icon-default">
      <div className="profile-icon-muted">{icon}</div>
    </div>
    <div className="profile-row-text">
      <p className="profile-row-label">{label}</p>
      {description && <p className="profile-row-desc">{description}</p>}
    </div>
    {right}
  </div>
)

// Delete confirmation inline block
const DeleteConfirm: React.FC<{
  onCancel: () => void
  onConfirm: () => void
}> = ({ onCancel, onConfirm }) => (
  <div className="profile-delete-confirm">
    <p className="profile-delete-confirm-title">Are you sure?</p>
    <p className="profile-delete-confirm-body">
      This permanently deletes your account, favourites, ratings, and trip history. This cannot be undone.
    </p>
    <div className="profile-delete-actions">
      <button onClick={onCancel} className="profile-delete-cancel">Cancel</button>
      <button onClick={onConfirm} className="profile-delete-btn">Delete account</button>
    </div>
  </div>
)

// ════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════
const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [modal, setModal]                       = useState<ModalType>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const {
    displayName, email, memberSince, cityName,
    avatarSrc, stats, initials,
    notificationsOn, setNotificationsOn,
    locationSharing, setLocationSharing,
    uploadingPhoto,
    handleAvatarChange, handleNameSave,
    handlePasswordChange, handleDeleteAccount,
  } = useProfile()

  const handleLogout = () => { logout(); navigate('/login') }

  const handleConfirmDelete = async () => {
    await handleDeleteAccount()
    navigate('/login')
  }

  return (
    <div className="profile-page">

      {/* ── HEADER ── */}
      <header className="profile-header">
        <div className="profile-header-inner">
          <div className="profile-logo">
            <div className="profile-logo-icon">
              <BusFront size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="profile-logo-text">
              TWENDE<span className="profile-logo-dot">.</span>
            </span>
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="profile-theme-btn"
          >
            {theme === 'dark'
              ? <Sun size={15} className="profile-theme-icon-sun" />
              : <Moon size={15} className="profile-theme-icon-moon" />
            }
          </button>
        </div>
      </header>

      <main className="profile-main">

        {/* ── HERO CARD ── */}
        <div className="profile-hero-card">
          <div className="profile-hero-top">
            <Avatar
              src={avatarSrc}
              initials={initials}
              uploading={uploadingPhoto}
              onClick={() => setModal('photo')}
            />
            <div className="profile-hero-info">
              {/* Role label — always "Passenger" on this page */}
              <span className="profile-role-badge">Passenger</span>

              {/* Name with edit trigger */}
              <button
                onClick={() => setModal('name')}
                className="profile-name-btn"
                aria-label="Edit name"
              >
                <span className="profile-name-text">{displayName}</span>
                <Edit3 size={13} className="profile-name-edit-icon" strokeWidth={2.5} />
              </button>

              <p className="profile-email">{email}</p>

              <div className="profile-member-since">
                <span className="profile-member-dot" />
                <span className="profile-member-text">Member since {memberSince}</span>
              </div>
            </div>
          </div>

          {/* Stats row — passenger-specific counts */}
          <div className="profile-stats-row">
            <StatChip
              icon={<Route size={16} strokeWidth={2.5} />}
              value={String(stats.trip_count)}
              label="Trips"
            />
            <StatChip
              icon={<Heart size={16} strokeWidth={2.5} />}
              value={String(stats.favourites_count)}
              label="Favourites"
            />
            <StatChip
              icon={<Star size={16} strokeWidth={2.5} />}
              value={stats.avg_score != null ? stats.avg_score.toFixed(1) : '—'}
              label="Avg Rating"
            />
          </div>
        </div>

        {/* ── APPEARANCE ── */}
        <div>
          <SectionLabel label="Appearance" />
          <SettingsCard>
            <RowDiv
              icon={theme === 'dark'
                ? <Sun size={16} strokeWidth={2.5} />
                : <Moon size={16} strokeWidth={2.5} />
              }
              label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              description={`Currently using ${theme} mode`}
              right={<Toggle enabled={theme === 'dark'} onChange={toggleTheme} label="Dark mode" />}
            />
          </SettingsCard>
        </div>

        {/* ── ACCOUNT ── */}
        <div>
          <SectionLabel label="Account" />
          <SettingsCard>
            <RowBtn
              icon={<User size={16} strokeWidth={2.5} />}
              label="Change profile photo"
              description="Upload a new picture"
              onClick={() => setModal('photo')}
            />
            <Divider />
            <RowBtn
              icon={<Edit3 size={16} strokeWidth={2.5} />}
              label="Change display name"
              description="Update how your name appears"
              onClick={() => setModal('name')}
            />
            <Divider />
            <RowBtn
              icon={<Lock size={16} strokeWidth={2.5} />}
              label="Change password"
              description="Update your account password"
              onClick={() => setModal('password')}
            />
            <Divider />
            <RowBtn
              icon={<Globe size={16} strokeWidth={2.5} />}
              label="City"
              description={`Currently set to ${cityName}`}
              onClick={() => setModal('city')}
            />
          </SettingsCard>
        </div>

        {/* ── NOTIFICATIONS ── */}
        <div>
          <SectionLabel label="Notifications" />
          <SettingsCard>
            <RowDiv
              icon={<Bell size={16} strokeWidth={2.5} />}
              label="Push notifications"
              description="Matatu arrivals and trip updates"
              right={
                <Toggle
                  enabled={notificationsOn}
                  onChange={setNotificationsOn}
                  label="Push notifications"
                />
              }
            />
            <Divider />
            <RowDiv
              icon={<Smartphone size={16} strokeWidth={2.5} />}
              label="Location sharing"
              description="Share your location while on board"
              right={
                <Toggle
                  enabled={locationSharing}
                  onChange={setLocationSharing}
                  label="Location sharing"
                />
              }
            />
          </SettingsCard>
        </div>

        {/* ── PRIVACY ── */}
        <div>
          <SectionLabel label="Privacy & Security" />
          <SettingsCard>
            <RowBtn
              icon={<Shield size={16} strokeWidth={2.5} />}
              label="Privacy policy"
              description="How we handle your data"
              onClick={() => {}}
            />
            <Divider />
            <RowBtn
              icon={<Lock size={16} strokeWidth={2.5} />}
              label="Data & permissions"
              description="Manage what Twende can access"
              onClick={() => {}}
            />
          </SettingsCard>
        </div>

        {/* ── SUPPORT ── */}
        <div>
          <SectionLabel label="Support" />
          <SettingsCard>
            <RowBtn
              icon={<HelpCircle size={16} strokeWidth={2.5} />}
              label="Help centre"
              description="FAQs and contact support"
              onClick={() => {}}
            />
            <Divider />
            <RowBtn
              icon={<Info size={16} strokeWidth={2.5} />}
              label="About Twende"
              description="Version 1.0.0 · Made in Kenya"
              onClick={() => {}}
              right={<span className="profile-version-tag">v1.0.0</span>}
            />
          </SettingsCard>
        </div>

        {/* ── DANGER ZONE ── */}
        <div>
          <SectionLabel label="Danger zone" />
          <SettingsCard>
            <RowBtn
              icon={<LogOut size={16} strokeWidth={2.5} />}
              label="Sign out"
              description="You can sign back in anytime"
              onClick={handleLogout}
              destructive
            />
            <Divider />
            {showDeleteConfirm ? (
              <DeleteConfirm
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
              />
            ) : (
              <RowBtn
                icon={<Trash2 size={16} strokeWidth={2.5} />}
                label="Delete account"
                description="Permanently remove your account"
                onClick={() => setShowDeleteConfirm(true)}
                destructive
              />
            )}
          </SettingsCard>
        </div>

        {/* ── FOOTER ── */}
        <footer className="profile-footer">
          <div className="profile-footer-brand">
            <div className="profile-footer-icon">
              <BusFront size={11} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="profile-footer-name">TWENDE</span>
          </div>
          <p className="profile-footer-tagline">Made with ❤️ in Kenya</p>
        </footer>

      </main>

      {/* ── MODAL ── */}
      {modal && (
        <ProfileModal
          type={modal}
          displayName={displayName}
          cityName={cityName}
          onClose={() => setModal(null)}
          onPhotoSelect={handleAvatarChange}
          onNameSave={handleNameSave}
          onPasswordSave={handlePasswordChange}
          uploadingPhoto={uploadingPhoto}
        />
      )}

      <BottomNav />
    </div>
  )
}

export default ProfilePage