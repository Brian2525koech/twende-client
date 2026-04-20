import React from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { StopWaitGroup } from './types'

interface Props {
  group: StopWaitGroup
  onClick: (group: StopWaitGroup) => void
}

const WaitingPassengerPin: React.FC<Props> = ({ group, onClick }) => {
  const count = group.passengers.length
  const hasAccepted = group.passengers.some(p => p.status === 'accepted')

  const bgColor = hasAccepted ? '#3B82F6' : '#EF4444'

  const pinHtml = renderToStaticMarkup(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          backgroundColor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2.5px solid white',
          boxShadow: '0 2px 10px rgba(0,0,0,0.28)',
          color: 'white',
          fontSize: '0.7rem',
          fontWeight: 900,
        }}
      >
        {count}
      </div>
      <div
        style={{
          width: 2,
          height: 8,
          backgroundColor: bgColor,
          marginTop: -1,
        }}
      />
    </div>
  )

  const icon = L.divIcon({
    html: pinHtml,
    className: '',
    iconSize: [34, 46],
    iconAnchor: [17, 44],
  })

  return (
    <Marker
      position={[group.lat, group.lng]}
      icon={icon}
      eventHandlers={{ click: () => onClick(group) }}
    />
  )
}

export default WaitingPassengerPin