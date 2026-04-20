// src/features/passenger/hooks/useProfile.ts
// Passenger-only profile hook with REAL Cloudinary upload (no more base64)
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import api from '@/lib/api/axios'

export interface ProfileStats {
  trip_count: number
  ratings_given: number
  avg_score: number | null
  favourites_count: number
}

export interface UseProfileReturn {
  displayName: string
  email: string
  memberSince: string
  cityName: string
  avatarSrc: string | null
  stats: ProfileStats
  notificationsOn: boolean
  setNotificationsOn: (val: boolean) => void
  locationSharing: boolean
  setLocationSharing: (val: boolean) => void
  uploadingPhoto: boolean
  initials: string
  handleAvatarChange: (file: File) => Promise<void>
  handleNameSave: (name: string) => Promise<void>
  handlePasswordChange: (current: string, next: string) => Promise<void>
  handleDeleteAccount: () => Promise<void>
}

// Kenyan cities mapped from city_id in users table
const CITY_MAP: Record<number, string> = {
  1: 'Nairobi',
  2: 'Kisumu',
  3: 'Mombasa',
  4: 'Nakuru',
  5: 'Eldoret',
  6: 'Bomet',
  7: 'Kericho',
}

export const useProfile = (): UseProfileReturn => {
  const { user, token, logout } = useAuth()

  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [avatarSrc, setAvatarSrc] = useState<string | null>(user?.profile_image_url ?? null)
  const [stats, setStats] = useState<ProfileStats>({
    trip_count: 0,
    ratings_given: 0,
    avg_score: null,
    favourites_count: 0,
  })
  const [notificationsOn, setNotificationsOn] = useState<boolean>(
    () => localStorage.getItem('twende_notif') !== 'false'
  )
  const [locationSharing, setLocationSharing] = useState<boolean>(
    () => localStorage.getItem('twende_location') === 'true'
  )
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Sync user context → local state
  useEffect(() => {
    if (user?.name) setDisplayName(user.name)
    if (user?.profile_image_url) setAvatarSrc(user.profile_image_url)
  }, [user?.name, user?.profile_image_url])

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('twende_notif', String(notificationsOn))
  }, [notificationsOn])

  useEffect(() => {
    localStorage.setItem('twende_location', String(locationSharing))
  }, [locationSharing])

  // Fetch passenger stats
  useEffect(() => {
    if (!token || !user?.id) return
    let cancelled = false

    const load = async () => {
      try {
        const res = await api.get('/passenger/profile/stats')
        if (!cancelled) setStats(res.data)
      } catch (err) {
        console.error('useProfile stats fetch failed:', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, user?.id])

  // ── Avatar change (NOW REAL CLOUDINARY UPLOAD) ─────────────────────────────
  const handleAvatarChange = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB')
      return
    }

    setUploadingPhoto(true)
    const toastId = toast.loading('Uploading photo…')

    try {
      const formData = new FormData()
      formData.append('image', file)   // ← must match upload.single('image')

      const res = await api.patch('/passenger/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const newUrl = res.data.profile_image_url
      setAvatarSrc(newUrl)                    // update UI immediately
      toast.success('Photo updated', { id: toastId })
    } catch (err: any) {
      console.error(err)
      toast.error('Could not upload photo', { id: toastId })
    } finally {
      setUploadingPhoto(false)
    }
  }, [])

  // ── Name save ─────────────────────────────────────────────────────────────
  const handleNameSave = useCallback(async (name: string) => {
    if (!name.trim()) return
    const toastId = toast.loading('Saving name…')
    try {
      await api.patch('/passenger/profile/name', { name: name.trim() })
      setDisplayName(name.trim())
      toast.success('Name updated', { id: toastId })
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Could not save name', { id: toastId })
      throw err
    }
  }, [])

  // ── Password change ───────────────────────────────────────────────────────
  const handlePasswordChange = useCallback(async (current: string, next: string) => {
    const toastId = toast.loading('Changing password…')
    try {
      await api.patch('/passenger/profile/password', {
        current_password: current,
        new_password: next,
      })
      toast.success('Password changed', { id: toastId })
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Could not change password'
      toast.error(msg, { id: toastId })
      throw new Error(msg)
    }
  }, [])

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = useCallback(async () => {
    const toastId = toast.loading('Deleting account…')
    try {
      await api.delete('/passenger/profile')
      toast.success('Account deleted', { id: toastId })
      logout()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Could not delete account', { id: toastId })
    }
  }, [logout])

  // ── Derived values ────────────────────────────────────────────────────────
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-KE', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently'

  const cityName = CITY_MAP[user?.city_id ?? 0] ?? 'Kenya'

  return {
    displayName,
    email: user?.email ?? '',
    memberSince,
    cityName,
    avatarSrc,
    stats,
    notificationsOn,
    setNotificationsOn,
    locationSharing,
    setLocationSharing,
    uploadingPhoto,
    initials,
    handleAvatarChange,
    handleNameSave,
    handlePasswordChange,
    handleDeleteAccount,
  }
}