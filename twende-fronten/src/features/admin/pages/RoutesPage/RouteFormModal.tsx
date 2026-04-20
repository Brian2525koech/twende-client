// src/features/admin/pages/RoutesPage/RouteFormModal.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { AdminRoute, City, RouteFormData } from './types';

interface Props {
  mode: 'add' | 'edit';
  route?: AdminRoute | null;
  cities: City[];
  onConfirm: (data: RouteFormData) => Promise<boolean>;
  onClose: () => void;
}

const PRESET_COLOURS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#1d9e75', '#ca8a04', '#64748b', '#0f172a',
];

const RouteFormModal: React.FC<Props> = ({ mode, route, cities, onConfirm, onClose }) => {
  const [form, setForm] = useState<RouteFormData>({
    name: '',
    colour: '#1d9e75',
    city_id: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && route) {
      setForm({
        name: route.name,
        colour: route.colour,
        city_id: route.city_id,
        description: route.description ?? '',
      });
    }
  }, [mode, route]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.city_id || !form.colour) return;
    setSubmitting(true);
    const ok = await onConfirm(form);
    setSubmitting(false);
    if (ok) onClose();
  };

  // Dynamic preview colour passed as CSS custom property
  const previewVar = { '--rte-preview-colour': form.colour } as React.CSSProperties;

  return (
    <div className="rte-modal-overlay" onClick={onClose}>
      <div className="rte-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rte-modal-header">
          <p className="rte-modal-title">
            {mode === 'add' ? 'Add New Route' : 'Edit Route'}
          </p>
          <button className="rte-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="rte-modal-body">
          {/* Name */}
          <div className="rte-field">
            <label className="rte-label" htmlFor="route-name">Route Name *</label>
            <input
              id="route-name"
              className="rte-input"
              type="text"
              placeholder="e.g. CBD → Westlands"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* City */}
          <div className="rte-field">
            <label className="rte-label" htmlFor="route-city">City *</label>
            <select
              id="route-city"
              title="Select city"
              className="rte-input rte-select"
              value={form.city_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, city_id: e.target.value ? Number(e.target.value) : '' }))
              }
            >
              <option value="">Select a city</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Colour */}
          <div className="rte-field">
            <label className="rte-label" htmlFor="route-colour">Route Colour *</label>
            {/* Preview div reads --rte-preview-colour via CSS */}
            <div className="rte-colour-row" style={previewVar}>
              <div className="rte-colour-preview" />
              <input
                id="route-colour"
                className="rte-input rte-colour-text"
                type="text"
                placeholder="#1d9e75"
                value={form.colour}
                onChange={(e) => setForm((p) => ({ ...p, colour: e.target.value }))}
              />
            </div>
            <div className="rte-colour-swatches">
              {PRESET_COLOURS.map((c) => (
                <button
                  key={c}
                  className={`rte-swatch${form.colour === c ? ' rte-swatch-active' : ''}`}
                  style={{ '--rte-swatch-colour': c } as React.CSSProperties}
                  onClick={() => setForm((p) => ({ ...p, colour: c }))}
                  aria-label={`Select colour ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="rte-field">
            <label className="rte-label" htmlFor="route-desc">Description</label>
            <textarea
              id="route-desc"
              className="rte-input rte-textarea"
              placeholder="Short description of this route…"
              value={form.description}
              rows={2}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="rte-modal-footer">
          <button className="rte-btn-cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="rte-btn-confirm"
            onClick={handleSubmit}
            disabled={submitting || !form.name.trim() || !form.city_id}
          >
            {submitting ? (
              <span className="rte-spinner" />
            ) : mode === 'add' ? (
              'Create Route'
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteFormModal;