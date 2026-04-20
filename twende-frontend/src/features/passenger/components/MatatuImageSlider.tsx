// src/features/passenger/components/MatatuImageSlider.tsx
import React, { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, BusFront } from 'lucide-react'
import type { MatatuImage } from '../hooks/useMatatuDetail'

interface Props {
  images: MatatuImage[]
  plateNumber: string
  vehicleColour: string | null
  routeColour: string
  onBack: () => void
}

const MatatuImageSlider: React.FC<Props> = ({
  images,
  plateNumber,
  vehicleColour,
  routeColour,
  onBack,
}) => {
  const [index, setIndex] = useState(0)

  const prev = useCallback(() => {
    setIndex(i => (i === 0 ? images.length - 1 : i - 1))
  }, [images.length])

  const next = useCallback(() => {
    setIndex(i => (i === images.length - 1 ? 0 : i + 1))
  }, [images.length])

  return (
    <div className="relative overflow-hidden bg-slate-900 dark:bg-[#0a0f0d]">
      <button
        onClick={onBack}
        className="matatu-back-btn"
        aria-label="Go back"
      >
        <ChevronLeft size={18} strokeWidth={2.5} />
      </button>

      {images.length === 0 ? (
        <div
          className="matatu-slider-placeholder"
          style={{ background: `linear-gradient(135deg, ${routeColour}18, ${routeColour}08)` }}
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ backgroundColor: `${routeColour}20` }}
          >
            <BusFront size={40} strokeWidth={1.5} style={{ color: routeColour }} />
          </div>
          <div className="text-center">
            <p className="text-base font-black text-slate-700 dark:text-slate-200">
              {plateNumber}
            </p>
            {vehicleColour && (
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                {vehicleColour}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-hidden">
            <div
              className="matatu-slider-track"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {images.map((img, i) => (
                <div key={img.id} className="matatu-slider-slide">
                  <img
                    src={img.image_url}
                    alt={img.caption ?? `${plateNumber} photo ${i + 1}`}
                    className="matatu-slider-img"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                  <div className="matatu-hero-overlay" />
                  {img.caption && (
                    <p className="absolute bottom-10 left-4 right-16 text-white text-xs font-bold">
                      {img.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="matatu-slider-arrow prev"
                aria-label="Previous"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <button
                onClick={next}
                className="matatu-slider-arrow next"
                aria-label="Next"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
              <div className="matatu-slider-dots">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={`matatu-slider-dot${i === index ? ' active' : ''}`}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default MatatuImageSlider