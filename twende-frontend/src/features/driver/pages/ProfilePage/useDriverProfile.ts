// src/features/driver/pages/ProfilePage/useDriverProfile.ts
// This hook defines ALL the API calls the DriverProfilePage needs.
// Use this file to build the backend route requirements.
//
// Required backend endpoints:
//   GET    /api/driver/profile              → returns DriverProfilePageData
//   PATCH  /api/driver/profile/name         → { name }
//   PATCH  /api/driver/profile/password     → { current_password, new_password }
//   PATCH  /api/driver/profile/avatar       → { profile_image_url }
//   PATCH  /api/driver/profile/vehicle      → { vehicle_make, vehicle_model, vehicle_year, vehicle_colour, capacity }
//   PATCH  /api/driver/profile/amenities    → { amenities: string[] }
//   POST   /api/driver/profile/images       → { image_url, caption, order_index }
//   DELETE /api/driver/profile/images/:id   → deletes one image
//   PATCH  /api/driver/profile/images/:id   → { caption?, order_index? }

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api/axios';
import type { DriverProfilePageData, MatatuImage } from './types';

interface UseDriverProfileReturn {
  data:           DriverProfilePageData | null;
  loading:        boolean;
  uploadingPhoto: boolean;
  uploadingImage: boolean;
  refresh:        () => Promise<void>;
  // Mutations
  saveName:          (name: string) => Promise<void>;
  savePassword:      (current: string, next: string) => Promise<void>;
  saveAvatar:        (file: File) => Promise<void>;
  saveVehicle:       (fields: VehicleFields) => Promise<void>;
  saveAmenities:     (amenities: string[]) => Promise<void>;
  addMatatuImage:    (file: File, caption: string) => Promise<void>;
  deleteMatatuImage: (imageId: number) => Promise<void>;
  reorderImages:     (images: MatatuImage[]) => Promise<void>;
}

export interface VehicleFields {
  vehicle_make:   string;
  vehicle_model:  string;
  vehicle_year:   number | null;
  vehicle_colour: string;
  capacity:       number;
}

export const useDriverProfile = (): UseDriverProfileReturn => {
  const [data,           setData]           = useState<DriverProfilePageData | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ── Fetch full profile ────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/driver/profile');
      setData(res.data);
    } catch (err) {
      console.error('Driver profile fetch failed:', err);
      toast.error('Could not load your profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Helper: read file as base64 ───────────────────────────────────────────
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ── Save name ─────────────────────────────────────────────────────────────
  const saveName = useCallback(async (name: string) => {
    const id = toast.loading('Saving name…');
    try {
      await api.patch('/driver/profile/name', { name: name.trim() });
      setData(prev => prev
        ? { ...prev, profile: { ...prev.profile, driver_name: name.trim() } }
        : prev
      );
      toast.success('Name updated', { id });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Could not update name', { id });
      throw err;
    }
  }, []);

  // ── Save password ─────────────────────────────────────────────────────────
  const savePassword = useCallback(async (current: string, next: string) => {
    const id = toast.loading('Changing password…');
    try {
      await api.patch('/driver/profile/password', {
        current_password: current,
        new_password:     next,
      });
      toast.success('Password changed', { id });
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Could not change password';
      toast.error(msg, { id });
      throw new Error(msg);
    }
  }, []);

  // ── Save avatar ───────────────────────────────────────────────────────────
  const saveAvatar = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setUploadingPhoto(true);
    const id = toast.loading('Uploading photo…');
    try {
      const dataUrl = await fileToBase64(file);
      // Optimistic update
      setData(prev => prev
        ? { ...prev, profile: { ...prev.profile, profile_image_url: dataUrl } }
        : prev
      );
      await api.patch('/driver/profile/avatar', { profile_image_url: dataUrl });
      toast.success('Photo updated', { id });
    } catch {
      toast.error('Could not upload photo', { id });
      await fetchProfile(); // revert on error
    } finally {
      setUploadingPhoto(false);
    }
  }, [fetchProfile]);

  // ── Save vehicle details ──────────────────────────────────────────────────
  const saveVehicle = useCallback(async (fields: VehicleFields) => {
    const id = toast.loading('Saving vehicle details…');
    try {
      await api.patch('/driver/profile/vehicle', fields);
      setData(prev => prev
        ? { ...prev, profile: { ...prev.profile, ...fields } }
        : prev
      );
      toast.success('Vehicle details updated', { id });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Could not save vehicle details', { id });
      throw err;
    }
  }, []);

  // ── Save amenities ────────────────────────────────────────────────────────
  const saveAmenities = useCallback(async (amenities: string[]) => {
    const id = toast.loading('Saving amenities…');
    try {
      await api.patch('/driver/profile/amenities', { amenities });
      setData(prev => prev
        ? { ...prev, profile: { ...prev.profile, amenities } }
        : prev
      );
      toast.success('Amenities updated', { id });
    } catch {
      toast.error('Could not save amenities', { id });
    }
  }, []);

  // ── Add matatu image ──────────────────────────────────────────────────────
  const addMatatuImage = useCallback(async (file: File, caption: string) => {
    if (file.size > 8 * 1024 * 1024) { toast.error('Image must be under 8 MB'); return; }
    if ((data?.images.length ?? 0) >= 5) { toast.error('Maximum 5 images allowed'); return; }

    setUploadingImage(true);
    const id = toast.loading('Uploading image…');
    try {
      const dataUrl = await fileToBase64(file);
      const nextOrder = (data?.images.length ?? 0) + 1;
      const res = await api.post('/driver/profile/images', {
        image_url:   dataUrl,
        caption:     caption.trim() || null,
        order_index: nextOrder,
      });
      const newImage: MatatuImage = res.data.image;
      setData(prev => prev
        ? { ...prev, images: [...prev.images, newImage] }
        : prev
      );
      toast.success('Image added', { id });
    } catch {
      toast.error('Could not upload image', { id });
    } finally {
      setUploadingImage(false);
    }
  }, [data?.images]);

  // ── Delete matatu image ───────────────────────────────────────────────────
  const deleteMatatuImage = useCallback(async (imageId: number) => {
    const id = toast.loading('Deleting image…');
    try {
      await api.delete(`/driver/profile/images/${imageId}`);
      setData(prev => prev
        ? { ...prev, images: prev.images.filter(img => img.id !== imageId) }
        : prev
      );
      toast.success('Image removed', { id });
    } catch {
      toast.error('Could not delete image', { id });
    }
  }, []);

  // ── Reorder images ────────────────────────────────────────────────────────
  const reorderImages = useCallback(async (images: MatatuImage[]) => {
    // Optimistic update
    setData(prev => prev ? { ...prev, images } : prev);
    try {
      // Send new order indices to backend
      await Promise.all(
        images.map((img, idx) =>
          api.patch(`/driver/profile/images/${img.id}`, { order_index: idx + 1 })
        )
      );
    } catch {
      toast.error('Could not save image order');
      await fetchProfile(); // revert
    }
  }, [fetchProfile]);

  return {
    data, loading, uploadingPhoto, uploadingImage,
    refresh: fetchProfile,
    saveName, savePassword, saveAvatar,
    saveVehicle, saveAmenities,
    addMatatuImage, deleteMatatuImage, reorderImages,
  };
};