import React, { useState } from 'react'
import { X, MapPin, Navigation, Clock, UserCheck, LogIn } from 'lucide-react'
import type { StopWaitGroup, WaitingPassenger } from './types'

interface Props {
  group: StopWaitGroup
  myDriverId: number
  onClose: () => void
  onAccept: (waitingId: number) => Promise<boolean>
  onBoard: (waitingId: number) => Promise<boolean>
}

const PassengerRow: React.FC<{
  passenger: WaitingPassenger
  myDriverId: number
  onAccept: (id: number) => Promise<boolean>
  onBoard: (id: number) => Promise<boolean>
}> = ({ passenger, myDriverId, onAccept, onBoard }) => {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const isMyAccepted =
    passenger.status === 'accepted' &&
    passenger.accepted_by_driver_id === myDriverId

  const waitMinutes = Math.round(
    (Date.now() - new Date(passenger.created_at).getTime()) / 60000
  )

  const initials = passenger.passenger_name
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const handleAccept = async () => {
    setLoading(true)
    const ok = await onAccept(passenger.id)
    if (ok) setDone(true)
    setLoading(false)
  }

  const handleBoard = async () => {
    setLoading(true)
    await onBoard(passenger.id)
    setLoading(false)
  }

  return (
    <div className="dmap-passenger-row border-slate-100 dark:border-white/[0.06]">
      <div className="dmap-passenger-avatar bg-[#1D9E75]/10 dark:bg-[#1D9E75]/20">
        <span className="text-sm font-black text-[#1D9E75]">{initials}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
          {passenger.passenger_name}
        </p>
        {passenger.destination_name && (
          <div className="flex items-center gap-1 mt-1">
            <Navigation size={10} className="text-slate-400" strokeWidth={2.5} />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              → {passenger.destination_name}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          <Clock size={10} className="text-slate-400" strokeWidth={2.5} />
          <span className="text-[10px] text-slate-400 font-medium">
            Waiting {waitMinutes}m
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        {isMyAccepted ? (
          <button
            onClick={handleBoard}
            disabled={loading}
            className="dmap-action-btn board"
          >
            {loading ? '…' : 'Boarded'}
          </button>
        ) : passenger.status === 'accepted' ? (
          <span className="dmap-action-btn accepted-label">
            Taken
          </span>
        ) : done ? (
          <span className="dmap-action-btn accepted-label">
            <UserCheck size={12} strokeWidth={2.5} /> Accepted
          </span>
        ) : (
          <button
            onClick={handleAccept}
            disabled={loading}
            className="dmap-action-btn accept"
          >
            {loading ? '…' : 'Accept'}
          </button>
        )}
      </div>
    </div>
  )
}

const WaitingBottomSheet: React.FC<Props> = ({
  group, myDriverId, onClose, onAccept, onBoard,
}) => {
  return (
    <div
      className="dmap-sheet-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="dmap-sheet bg-white dark:bg-[#111816]">
        <div className="dmap-sheet-handle bg-slate-200 dark:bg-white/10" />

        <div className="flex items-start justify-between mb-3 px-1">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <MapPin size={14} className="text-[#1D9E75]" strokeWidth={2.5} />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {group.stop_name}
              </h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium pl-5">
              {group.passengers.length} passenger{group.passengers.length !== 1 ? 's' : ''} waiting
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0"
            aria-label="Close"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div>
          {group.passengers.map(p => (
            <PassengerRow
              key={p.id}
              passenger={p}
              myDriverId={myDriverId}
              onAccept={onAccept}
              onBoard={onBoard}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default WaitingBottomSheet