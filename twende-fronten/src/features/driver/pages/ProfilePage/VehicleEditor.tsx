// src/features/driver/pages/ProfilePage/VehicleEditor.tsx
import React, { useState } from 'react';
import { Edit3, Save, X, Plus } from 'lucide-react';
import type { DriverProfileData } from './types';
import type { VehicleFields } from './useDriverProfile';

interface Props {
  profile:     DriverProfileData;
  onSave:      (fields: VehicleFields) => Promise<void>;
  onAmenities: (amenities: string[]) => Promise<void>;
}

const COMMON_AMENITIES = [
  'Music', 'USB Charging', 'Air Conditioning',
  'Air Freshener', 'WiFi', 'TV Screen', 'Curtains',
  'Leather Seats', 'Tinted Windows',
];

const VehicleEditor: React.FC<Props> = ({ profile, onSave, onAmenities }) => {
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [amenSaving, setAmenSaving] = useState(false);
  const [customAmen, setCustomAmen] = useState('');

  const [fields, setFields] = useState<VehicleFields>({
    vehicle_make:   profile.vehicle_make   ?? '',
    vehicle_model:  profile.vehicle_model  ?? '',
    vehicle_year:   profile.vehicle_year   ?? null,
    vehicle_colour: profile.vehicle_colour ?? '',
    capacity:       profile.capacity       ?? 14,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(fields);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFields({
      vehicle_make:   profile.vehicle_make   ?? '',
      vehicle_model:  profile.vehicle_model  ?? '',
      vehicle_year:   profile.vehicle_year   ?? null,
      vehicle_colour: profile.vehicle_colour ?? '',
      capacity:       profile.capacity       ?? 14,
    });
    setEditing(false);
  };

  const toggleAmenity = async (amen: string) => {
    const current = profile.amenities ?? [];
    const next = current.includes(amen)
      ? current.filter(a => a !== amen)
      : [...current, amen];
    setAmenSaving(true);
    try { await onAmenities(next); }
    finally { setAmenSaving(false); }
  };

  const addCustomAmenity = async () => {
    const val = customAmen.trim();
    if (!val || profile.amenities?.includes(val)) { setCustomAmen(''); return; }
    setAmenSaving(true);
    try {
      await onAmenities([...(profile.amenities ?? []), val]);
      setCustomAmen('');
    } finally {
      setAmenSaving(false);
    }
  };

  return (
    <div className="dp-card">

      {/* Vehicle details */}
      <div className="dp-card-header">
        <p className="dp-card-title">Vehicle Details</p>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="dp-edit-btn">
            <Edit3 size={14} strokeWidth={2.5} />
            Edit
          </button>
        ) : (
          <div className="dp-edit-actions">
            <button type="button" onClick={handleCancel} className="dp-cancel-btn" title="Cancel">
              <X size={14} strokeWidth={2.5} />
            </button>
            <button onClick={handleSave} disabled={saving} className="dp-save-btn">
              {saving ? <div className="dp-spinner dp-spinner-sm" /> : <Save size={14} strokeWidth={2.5} />}
              Save
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="dp-vehicle-form">
          {([
            { key: 'vehicle_make',   label: 'Make (e.g. Isuzu)',       type: 'text' },
            { key: 'vehicle_model',  label: 'Model (e.g. NPR)',        type: 'text' },
            { key: 'vehicle_year',   label: 'Year (e.g. 2019)',        type: 'number' },
            { key: 'vehicle_colour', label: 'Colour (e.g. White & Green)', type: 'text' },
            { key: 'capacity',       label: 'Passenger capacity',      type: 'number' },
          ] as const).map(({ key, label, type }) => (
            <div key={key} className="dp-form-field">
              <label className="dp-form-label">{label}</label>
              <input
                type={type}
                value={fields[key] ?? ''}
                onChange={e => setFields(prev => ({
                  ...prev,
                  [key]: type === 'number'
                    ? (e.target.value === '' ? null : parseInt(e.target.value, 10))
                    : e.target.value,
                }))}
                className="dp-input"
                placeholder={label}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="dp-vehicle-grid">
          {[
            { label: 'Plate',     value: profile.plate_number },
            { label: 'Make',      value: profile.vehicle_make },
            { label: 'Model',     value: profile.vehicle_model },
            { label: 'Year',      value: profile.vehicle_year?.toString() },
            { label: 'Colour',    value: profile.vehicle_colour },
            { label: 'Capacity',  value: profile.capacity ? `${profile.capacity} seats` : null },
          ].filter(d => d.value).map(({ label, value }) => (
            <div key={label} className="dp-vehicle-item">
              <p className="dp-vehicle-label">{label}</p>
              <p className="dp-vehicle-value">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Amenities */}
      <div className="dp-divider" />
      <div className="dp-card-header">
        <p className="dp-card-title">On-board Amenities</p>
        {amenSaving && <div className="dp-spinner dp-spinner-sm" />}
      </div>

      <div className="dp-amenities-grid">
        {COMMON_AMENITIES.map(amen => {
          const active = profile.amenities?.includes(amen);
          return (
            <button
              key={amen}
              onClick={() => toggleAmenity(amen)}
              disabled={amenSaving}
              className={`dp-amenity-chip ${active ? 'dp-amenity-active' : ''}`}
            >
              {active ? '✓ ' : ''}{amen}
            </button>
          );
        })}
      </div>

      {/* Custom amenity input */}
      <div className="dp-custom-amenity-row">
        <input
          value={customAmen}
          onChange={e => setCustomAmen(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addCustomAmenity(); }}
          placeholder="Add custom amenity…"
          className="dp-input dp-input-flex"
          maxLength={40}
        />
        <button
          type="button"
          onClick={addCustomAmenity}
          disabled={!customAmen.trim() || amenSaving}
          className="dp-add-amen-btn"
          title="Add custom amenity"
        >
          <Plus size={15} strokeWidth={2.5} />
        </button>
      </div>

      {/* Current custom amenities (ones not in COMMON_AMENITIES) */}
      {profile.amenities?.filter(a => !COMMON_AMENITIES.includes(a)).map(amen => (
        <button
          key={amen}
          onClick={() => toggleAmenity(amen)}
          className="dp-amenity-chip dp-amenity-active dp-amenity-custom"
        >
          ✓ {amen}
        </button>
      ))}
    </div>
  );
};

export default VehicleEditor;