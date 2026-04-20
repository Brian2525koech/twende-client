import React from 'react'
import { MapPin } from 'lucide-react'
import type { MatatuStop } from '../hooks/useMatatuDetail'

interface Props {
  stops: MatatuStop[]
  routeColour: string
}

const MatatuStopList: React.FC<Props> = ({ stops, routeColour }) => {
  if (stops.length === 0) return (
    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium text-center py-4">
      No stops available
    </p>
  )

  return (
    <div className="flex flex-col">
      {stops.map((stop, idx) => {
        const isFirst = idx === 0
        const isLast = idx === stops.length - 1
        return (
          <div key={stop.id} className="flex items-start gap-3 relative">
            {!isLast && (
              <div
                className="stop-connector"
                style={{ backgroundColor: `${routeColour}25` }}
              />
            )}

            <div
              className="stop-dot mt-0.5"
              style={{
                backgroundColor: isFirst || isLast
                  ? routeColour
                  : `${routeColour}15`,
                borderColor: routeColour,
                borderWidth: isFirst || isLast ? 2 : 1.5,
              }}
            >
              {isFirst || isLast ? (
                <MapPin size={8} className="text-white" strokeWidth={3} />
              ) : (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: routeColour }}
                />
              )}
            </div>

            <div className="pb-4 flex-1 min-w-0">
              <p className={`text-sm leading-snug ${
                isFirst || isLast
                  ? 'font-extrabold text-slate-900 dark:text-white'
                  : 'font-medium text-slate-500 dark:text-slate-400'
              }`}>
                {stop.name}
              </p>
              {(isFirst || isLast) && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: routeColour }}
                >
                  {isFirst ? 'Origin' : 'Terminus'}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MatatuStopList