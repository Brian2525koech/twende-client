import React from 'react'
import { Star, User } from 'lucide-react'
import type { MatatuReview } from '../hooks/useMatatuDetail'

interface Props { review: MatatuReview }

const MatatuReviewCard: React.FC<Props> = ({ review }) => {
  const initials = review.passenger_name
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  const date = new Date(review.created_at).toLocaleDateString('en-KE', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="review-card bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#1D9E75]/10 dark:bg-[#1D9E75]/20 flex items-center justify-center shrink-0">
          {review.passenger_name
            ? <span className="text-xs font-black text-[#1D9E75]">{initials}</span>
            : <User size={14} className="text-[#1D9E75]" strokeWidth={2.5} />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none">
                {review.passenger_name ?? 'Anonymous'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                {date}
              </p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {[1,2,3,4,5].map(s => (
                <Star
                  key={s}
                  size={11}
                  className={s <= review.overall_score
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-200 dark:text-slate-700'}
                  strokeWidth={2}
                />
              ))}
            </div>
          </div>

          {review.comment && (
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed mt-2">
              {review.comment}
            </p>
          )}

          <div className="flex gap-3 mt-2.5">
            {[
              { label: 'Punct.', score: review.punctuality_score },
              { label: 'Comfort', score: review.comfort_score },
              { label: 'Safety', score: review.safety_score },
            ].map(({ label, score }) => (
              <div key={label} className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  {label}
                </span>
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
                  {score}/5
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MatatuReviewCard