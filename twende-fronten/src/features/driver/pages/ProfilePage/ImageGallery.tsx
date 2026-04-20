// src/features/driver/pages/ProfilePage/ImageGallery.tsx
import React, { useRef } from 'react';
import { Plus, Trash2, GripVertical, ImageOff } from 'lucide-react';
import type { MatatuImage } from './types';

interface Props {
  images:         MatatuImage[];
  uploading:      boolean;
  onAdd:          (file: File, caption: string) => Promise<void>;
  onDelete:       (id: number) => Promise<void>;
  onReorder:      (imgs: MatatuImage[]) => Promise<void>;
}

const ImageGallery: React.FC<Props> = ({
  images, uploading, onAdd, onDelete, onReorder,
}) => {
  const fileRef    = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file    = e.target.files?.[0];
    const caption = captionRef.current?.value ?? '';
    if (!file) return;
    await onAdd(file, caption);
    if (captionRef.current) captionRef.current.value = '';
    e.target.value = '';
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...images];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onReorder(next);
  };
  const moveDown = (idx: number) => {
    if (idx === images.length - 1) return;
    const next = [...images];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onReorder(next);
  };

  return (
    <div className="dp-gallery-section">
      <div className="dp-gallery-header">
        <p className="dp-gallery-title">Matatu Photos</p>
        <p className="dp-gallery-sub">
          {images.length}/5 photos — these appear to passengers viewing your matatu
        </p>
      </div>

      {/* Existing images */}
      {images.length > 0 ? (
        <div className="dp-gallery-grid">
          {images.map((img, idx) => (
            <div key={img.id} className="dp-gallery-item">
              <img
                src={img.image_url}
                alt={img.caption ?? `Photo ${idx + 1}`}
                className="dp-gallery-img"
              />
              {/* Overlay controls */}
              <div className="dp-gallery-overlay">
                <div className="dp-gallery-order-btns">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="dp-gallery-order-btn"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === images.length - 1}
                    className="dp-gallery-order-btn"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </div>
                <button
                  onClick={() => onDelete(img.id)}
                  className="dp-gallery-delete-btn"
                  aria-label="Delete photo"
                >
                  <Trash2 size={14} strokeWidth={2.5} />
                </button>
              </div>
              {/* Caption */}
              {img.caption && (
                <p className="dp-gallery-caption">{img.caption}</p>
              )}
              <span className="dp-gallery-index">{idx + 1}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="dp-gallery-empty">
          <ImageOff size={30} strokeWidth={1.2} className="dp-gallery-empty-icon" />
          <p className="dp-gallery-empty-text">No photos yet — add your first one below</p>
        </div>
      )}

      {/* Add new photo */}
      {images.length < 5 && (
        <div className="dp-gallery-add">
          <input
            ref={captionRef}
            type="text"
            placeholder="Caption (optional)"
            className="dp-input"
            maxLength={80}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="dp-hidden"
            onChange={handleFileChange}
            aria-label="Select matatu photo"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="dp-gallery-add-btn"
          >
            {uploading
              ? <div className="dp-spinner" />
              : <Plus size={16} strokeWidth={2.5} />
            }
            {uploading ? 'Uploading…' : 'Add photo'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;