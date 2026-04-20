// src/features/passenger/components/MatatuRatingBreakdown.tsx
import React from 'react'
import { Star } from 'lucide-react'
import type { RatingBreakdown } from '../hooks/useMatatuDetail'

interface Props {
  breakdown: RatingBreakdown
  totalRatings: number
  averageRating: number
}

const CATS = [
  { key: 'punctuality' as const, label: 'Punct.' },
  { key: 'comfort' as const, label: 'Comfort' },
  { key: 'safety' as const, label: 'Safety' },
]

const MatatuRatingBreakdown: React.FC<Props> = ({
  breakdown,
  totalRatings,
  averageRating,
}) => {
  const safeTotal = totalRatings || 1

  return (
    <div className="flex gap-4 items-start">
      <div className="score-ring border-[#1D9E75]/30 dark:border-[#1D9E75]/40 bg-[#1D9E75]/5 dark:bg-[#1D9E75]/10">
        <span className="text-2xl font-black text-[#1D9E75] leading-none tracking-tight">
          {averageRating.toFixed(1)}
        </span>
        <div className="flex gap-0.5 mt-1">
          {[1,2,3,4,5].map(s => (
            <Star
              key={s}
              size={7}
              className={s <= Math.round(averageRating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-200 dark:text-slate-700'}
              strokeWidth={2}
            />
          ))}
        </div>
        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wide">
          {totalRatings} reviews
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex flex-col gap-1.5">
          {[5,4,3,2,1].map(star => {
            const count = breakdown.distribution[star] ?? 0
            const pct = Math.round((count / safeTotal) * 100)
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 w-2.5 text-right shrink-0">
                  {star}
                </span>
                <Star
                  size={8}
                  className="text-amber-400 fill-amber-400 shrink-0"
                  strokeWidth={2}
                />
                <div className="rating-bar-track bg-slate-100 dark:bg-white/[0.06] flex-1">
                  <div
                    className="rating-bar-fill bg-amber-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400 w-4 text-right shrink-0">
                  {count}
                </span>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {CATS.map(cat => (
            <div
              key={cat.key}
              className="flex flex-col items-center py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] gap-0.5"
            >
              <span className="text-sm font-black text-slate-800 dark:text-white">
                {(breakdown.averages[cat.key] || 0).toFixed(1)}
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                {cat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MatatuRatingBreakdown