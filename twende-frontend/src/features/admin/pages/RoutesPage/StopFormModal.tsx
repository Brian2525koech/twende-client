// src/features/admin/pages/RoutesPage/StopFormModal.tsx
import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import type { RouteStop, StopFormData } from './types';

interface Props {
  mode: 'add' | 'edit';
  stop?: RouteStop | null;
  routeName: string;
  onConfirm: (data: StopFormData) => Promise<boolean>;
  onClose: () => void;
}

const StopFormModal: React.FC<Props> = ({ mode, stop, routeName, onConfirm, onClose }) => {
  const [form, setForm] = useState<StopFormData>({ name: '', lat: '', lng: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && stop) {
      setForm({
        name: stop.name,
        lat: String(stop.lat),
        lng: String(stop.lng),
      });
    }
  }, [mode, stop]);

  const isValid =
    form.name.trim() &&
    form.lat.trim() &&
    form.lng.trim() &&
    !isNaN(parseFloat(form.lat)) &&
    !isNaN(parseFloat(form.lng));

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    const ok = await onConfirm(form);
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div className="rte-modal-overlay" onClick={onClose}>
      <div className="rte-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rte-modal-header">
          <div>
            <p className="rte-modal-title">
              {mode === 'add' ? 'Add Stop' : 'Edit Stop'}
            </p>
            <p className="rte-modal-subtitle">{routeName}</p>
          </div>
          <button className="rte-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="rte-modal-body">
          {/* Stop Name */}
          <div className="rte-field">
            <label className="rte-label">Stop Name *</label>
            <input
              className="rte-input"
              type="text"
              placeholder="e.g. CBD Bus Station"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Coordinates */}
          <div className="rte-field-row">
            <div className="rte-field">
              <label className="rte-label">Latitude *</label>
              <input
                className="rte-input"
                type="number"
                step="any"
                placeholder="-1.2921"
                value={form.lat}
                onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
              />
            </div>
            <div className="rte-field">
              <label className="rte-label">Longitude *</label>
              <input
                className="rte-input"
                type="number"
                step="any"
                placeholder="36.8219"
                value={form.lng}
                onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
              />
            </div>
          </div>

          {/* Hint */}
          <div className="rte-coord-hint">
            <MapPin size={11} strokeWidth={2.5} />
            <span>Coordinates can be copied from Google Maps — right-click any point</span>
          </div>
        </div>

        <div className="rte-modal-footer">
          <button className="rte-btn-cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="rte-btn-confirm"
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {submitting ? (
              <span className="rte-spinner" />
            ) : mode === 'add' ? (
              'Add Stop'
            ) : (
              'Save Stop'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StopFormModal;