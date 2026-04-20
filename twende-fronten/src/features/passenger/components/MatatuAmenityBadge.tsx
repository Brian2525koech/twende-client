import React from 'react'
import { Wifi, Music, Wind, Zap, Shield, Coffee, Star } from 'lucide-react'

interface Props { amenity: string }

const CONFIG: Record<string, {
  icon: React.ReactNode
  bg: string
  border: string
  text: string
}> = {
  WiFi: {
    icon: <Wifi size={12} strokeWidth={2.5} />,
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-100 dark:border-blue-500/20',
    text: 'text-blue-700 dark:text-blue-400',
  },
  Music: {
    icon: <Music size={12} strokeWidth={2.5} />,
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    border: 'border-purple-100 dark:border-purple-500/20',
    text: 'text-purple-700 dark:text-purple-400',
  },
  AC: {
    icon: <Wind size={12} strokeWidth={2.5} />,
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    border: 'border-teal-100 dark:border-teal-500/20',
    text: 'text-teal-700 dark:text-teal-400',
  },
  'USB Charging': {
    icon: <Zap size={12} strokeWidth={2.5} />,
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-100 dark:border-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
  },
  Safety: {
    icon: <Shield size={12} strokeWidth={2.5} />,
    bg: 'bg-green-50 dark:bg-green-500/10',
    border: 'border-green-100 dark:border-green-500/20',
    text: 'text-green-700 dark:text-green-400',
  },
  Refreshments: {
    icon: <Coffee size={12} strokeWidth={2.5} />,
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-100 dark:border-orange-500/20',
    text: 'text-orange-700 dark:text-orange-400',
  },
}

const MatatuAmenityBadge: React.FC<Props> = ({ amenity }) => {
  const c = CONFIG[amenity] ?? {
    icon: <Star size={12} strokeWidth={2.5} />,
    bg: 'bg-slate-50 dark:bg-white/[0.04]',
    border: 'border-slate-100 dark:border-white/[0.06]',
    text: 'text-slate-600 dark:text-slate-400',
  }

  return (
    <span className={`amenity-badge ${c.bg} ${c.border} ${c.text}`}>
      {c.icon}
      {amenity}
    </span>
  )
}

export default MatatuAmenityBadge