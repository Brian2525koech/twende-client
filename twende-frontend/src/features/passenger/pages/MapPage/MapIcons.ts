// src/features/passenger/pages/MapPage/MapIcons.ts
import L from 'leaflet';

export const createBusIcon = (
  plate: string,
  selected: boolean,
  isWaiting: boolean
): L.DivIcon => {
  const bodyBg = isWaiting
    ? 'linear-gradient(145deg,#fbbf24,#f59e0b)'
    : 'linear-gradient(145deg,#25c896,#1D9E75)';

  const shadow = isWaiting
    ? '0 4px 0 rgba(0,0,0,0.2),0 0 0 3px rgba(245,158,11,0.25)'
    : '0 4px 0 rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.25)';

  const plateExtra  = isWaiting ? 'map-plate-paused' : '';
  const prefix      = isWaiting ? '⏸ ' : '';
  const markerExtra = selected  ? 'map-bus-selected' : '';
  const pulseExtra  = selected  ? 'map-bus-pulse-on' : '';

  return new L.DivIcon({
    className: '',
    html: `
      <div class="map-bus-marker ${markerExtra}">
        <div class="map-bus-pulse ${pulseExtra}"></div>
        <div class="map-bus-body" style="background:${bodyBg};box-shadow:${shadow}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="22" height="13" rx="2"/>
            <path d="M5 16v2a1 1 0 001 1h1a1 1 0 001-1v-2M15 16v2a1 1 0 001 1h1a1 1 0 001-1v-2"/>
            <line x1="1" y1="8" x2="23" y2="8"/>
            <line x1="8" y1="3" x2="8" y2="8"/>
            <line x1="16" y1="3" x2="16" y2="8"/>
          </svg>
        </div>
        <div class="map-bus-plate ${plateExtra}">${prefix}${plate}</div>
      </div>`,
    iconSize:     [72, 76],
    iconAnchor:   [36, 76],
    popupAnchor:  [0, -80],
  });
};

// User's own position pin — "I am here"
export const createUserIcon = (): L.DivIcon =>
  new L.DivIcon({
    className: '',
    html: `
      <div class="map-user-marker">
        <div class="map-user-pulse"></div>
        <div class="map-user-dot"></div>
      </div>`,
    iconSize:   [24, 24],
    iconAnchor: [12, 12],
  });

// Waiting passenger marker — pulsing amber pin shown on the map
export const createWaitingPassengerIcon = (name: string): L.DivIcon =>
  new L.DivIcon({
    className: '',
    html: `
      <div class="map-waiting-marker">
        <div class="map-waiting-ring map-waiting-ring-1"></div>
        <div class="map-waiting-ring map-waiting-ring-2"></div>
        <div class="map-waiting-body">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="map-waiting-label">${name}</div>
      </div>`,
    iconSize:   [64, 68],
    iconAnchor: [32, 68],
  });