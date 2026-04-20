// src/features/admin/pages/DriversPage/AddDriverModal.tsx
import React, { useState } from 'react';
import { X, Bus, Eye, EyeOff } from 'lucide-react';
import type { RouteOption, CityOption, AddDriverForm } from './types';

interface Props {
  routes:   RouteOption[];
  cities:   CityOption[];
  onClose:  () => void;
  onSubmit: (form: AddDriverForm) => Promise<boolean>;
}

const EMPTY: AddDriverForm = {
  name: '', email: '', password: '', plate_number: '',
  route_id: '', city_id: '', capacity: 40,
};

const AddDriverModal: React.FC<Props> = ({ routes, cities, onClose, onSubmit }) => {
  const [form,       setForm]       = useState<AddDriverForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [errors,     setErrors]     = useState<Partial<Record<keyof AddDriverForm, string>>>({});

  const set = (k: keyof AddDriverForm, v: string | number) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim())             e.name         = 'Name is required';
    if (!form.email.trim())            e.email        = 'Email is required';
    if (!form.password.trim())         e.password     = 'Password is required';
    else if (form.password.length < 6) e.password     = 'Min 6 characters';
    if (!form.plate_number.trim())     e.plate_number = 'Plate number is required';
    if (!form.city_id)                 e.city_id      = 'Select a city';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const ok = await onSubmit(form);
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div className="drvr-modal-overlay" onClick={onClose}>
      <div className="drvr-modal" onClick={(e) => e.stopPropagation()}>

        {/* Modal header */}
        <div className="drvr-modal-header">
          <div className="drvr-modal-icon">
            <Bus size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="drvr-modal-title">Add New Driver</p>
            <p className="drvr-modal-sub">Creates a driver account + profile</p>
          </div>
          <button className="drvr-panel-close" onClick={onClose} aria-label="Close modal">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="drvr-modal-body">

          {/* Name */}
          <div className="drvr-field">
            <label htmlFor="add-name" className="drvr-label">Full Name</label>
            <input
              id="add-name"
              className={`drvr-input${errors.name ? ' drvr-input-error' : ''}`}
              placeholder="e.g. John Kamau"
              title="Driver full name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
            {errors.name && <span className="drvr-error-msg">{errors.name}</span>}
          </div>

          {/* Email */}
          <div className="drvr-field">
            <label htmlFor="add-email" className="drvr-label">Email Address</label>
            <input
              id="add-email"
              className={`drvr-input${errors.email ? ' drvr-input-error' : ''}`}
              type="email"
              placeholder="driver@example.com"
              title="Driver email address"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
            {errors.email && <span className="drvr-error-msg">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="drvr-field">
            <label htmlFor="add-password" className="drvr-label">Password</label>
            <div className="drvr-input-wrap">
              <input
                id="add-password"
                className={`drvr-input drvr-input-pw${errors.password ? ' drvr-input-error' : ''}`}
                type={showPass ? 'text' : 'password'}
                placeholder="Min 6 characters"
                title="Driver account password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
              />
              <button
                className="drvr-pw-toggle"
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && <span className="drvr-error-msg">{errors.password}</span>}
          </div>

          {/* Plate + capacity row */}
          <div className="drvr-field-row">
            <div className="drvr-field">
              <label htmlFor="add-plate" className="drvr-label">Plate Number</label>
              <input
                id="add-plate"
                className={`drvr-input drvr-input-upper${errors.plate_number ? ' drvr-input-error' : ''}`}
                placeholder="KCA 123A"
                title="Vehicle plate number"
                value={form.plate_number}
                onChange={(e) => set('plate_number', e.target.value.toUpperCase())}
              />
              {errors.plate_number && <span className="drvr-error-msg">{errors.plate_number}</span>}
            </div>
            <div className="drvr-field drvr-field-sm">
              <label htmlFor="add-capacity" className="drvr-label">Capacity</label>
              <input
                id="add-capacity"
                className="drvr-input"
                type="number"
                min={1}
                max={100}
                title="Vehicle passenger capacity"
                value={form.capacity}
                onChange={(e) => set('capacity', Number(e.target.value))}
              />
            </div>
          </div>

          {/* City */}
          <div className="drvr-field">
            <label htmlFor="add-city" className="drvr-label">City</label>
            <select
              id="add-city"
              className={`drvr-select${errors.city_id ? ' drvr-input-error' : ''}`}
              title="Select driver city"
              value={form.city_id}
              onChange={(e) => set('city_id', Number(e.target.value))}
            >
              <option value="">Select city…</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.city_id && <span className="drvr-error-msg">{errors.city_id}</span>}
          </div>

          {/* Route (optional) */}
          <div className="drvr-field">
            <label htmlFor="add-route" className="drvr-label">
              Route <span className="drvr-label-optional">(optional)</span>
            </label>
            <select
              id="add-route"
              className="drvr-select"
              title="Assign a route to this driver"
              value={form.route_id}
              onChange={(e) => set('route_id', e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Assign later…</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name} — {r.city}</option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            className="drvr-modal-submit"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting
              ? <><span className="drvr-spinner white" /> Creating account…</>
              : <><Bus size={14} /> Create Driver Account</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDriverModal;