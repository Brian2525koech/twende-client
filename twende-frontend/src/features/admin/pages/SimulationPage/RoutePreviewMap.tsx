// src/features/admin/pages/SimulationPage/RoutePreviewMap.tsx
// A small Leaflet map embedded in each driver card showing:
// - The OSRM road-snapped route polyline
// - The current bus position (from sim status)
// - Stop dots along the route
import React, { useEffect, useRef } from 'react';
import type { RouteWaypoint, RouteStop, SimStatus } from './types';

interface Props {
  waypoints:   RouteWaypoint[];
  stops:       RouteStop[];
  sim:         SimStatus | null;
  routeColour: string | null;
  driverId:    number;
}

// We load Leaflet lazily here since it's a heavy dependency
// and only needed when the map is expanded
const RoutePreviewMap: React.FC<Props> = ({
  waypoints, stops, sim, routeColour, driverId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const polyRef      = useRef<any>(null);
  const markerRef    = useRef<any>(null);

  // Build map once
  useEffect(() => {
    if (!containerRef.current || waypoints.length === 0) return;
    if (mapRef.current) return; // already initialised

    import('leaflet').then(L => {
      const colour = routeColour ?? '#1D9E75';

      // Centre on midpoint of route
      const mid = waypoints[Math.floor(waypoints.length / 2)];
      const map = L.map(containerRef.current!, {
        center:      [mid.lat, mid.lng],
        zoom:        12,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      // Tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      // Route polyline (3-layer glow)
      const path = waypoints.map(w => [w.lat, w.lng] as [number, number]);
      L.polyline(path, { color: colour, weight: 18, opacity: 0.07 }).addTo(map);
      L.polyline(path, { color: colour, weight: 4,  opacity: 0.90 }).addTo(map);
      L.polyline(path, { color: '#7EEDC8', weight: 1.5, opacity: 0.65 }).addTo(map);
      polyRef.current = true;

      // Stop dots
      stops.forEach((s, idx) => {
        const isTerminus = idx === 0 || idx === stops.length - 1;
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:${isTerminus ? 12 : 8}px;
            height:${isTerminus ? 12 : 8}px;
            border-radius:50%;
            background:${isTerminus ? colour : 'rgba(29,158,117,0.50)'};
            border:2px solid white;
            box-shadow:0 1px 4px rgba(0,0,0,0.18);
          "></div>`,
          iconSize: [isTerminus ? 12 : 8, isTerminus ? 12 : 8],
          iconAnchor: [isTerminus ? 6 : 4, isTerminus ? 6 : 4],
        });
        L.marker([s.lat, s.lng], { icon }).addTo(map);
      });

      // Fit bounds
      const bounds = L.latLngBounds(path);
      map.fitBounds(bounds, { padding: [20, 20] });

      // Bus marker (if running)
      if (sim?.currentPosition) {
        const busIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:32px;height:32px;border-radius:10px;
            background:linear-gradient(145deg,#25c896,#1D9E75);
            border:2.5px solid white;
            box-shadow:0 4px 12px rgba(29,158,117,0.5);
            display:flex;align-items:center;justify-content:center;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="white" stroke-width="2.5" stroke-linecap="round">
              <rect x="1" y="3" width="22" height="13" rx="2"/>
              <path d="M5 16v2a1 1 0 001 1h1a1 1 0 001-1v-2M15 16v2a1 1 0 001 1h1a1 1 0 001-1v-2"/>
              <line x1="1" y1="8" x2="23" y2="8"/>
            </svg>
          </div>`,
          iconSize:   [32, 32],
          iconAnchor: [16, 32],
        });
        markerRef.current = L.marker(
          [sim.currentPosition.lat, sim.currentPosition.lng],
          { icon: busIcon }
        ).addTo(map);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        polyRef.current   = null;
      }
    };
  }, [waypoints, stops]); // eslint-disable-line

  // Update bus marker position when sim ticks
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !sim?.currentPosition) return;
    markerRef.current.setLatLng([sim.currentPosition.lat, sim.currentPosition.lng]);
  }, [sim?.currentPosition?.lat, sim?.currentPosition?.lng]);

  if (waypoints.length === 0) {
    return (
      <div className="sim-map-loading">
        <div className="sim-map-spinner" />
        <span>Loading route geometry…</span>
      </div>
    );
  }

  return (
    <div className="sim-map-wrap">
      <div ref={containerRef} className="sim-map-container" />
      {/* Overlay info */}
      <div className="sim-map-overlay">
        <span className="sim-map-waypoints">
          {waypoints.length.toLocaleString()} waypoints
        </span>
        {sim?.currentPosition && (
          <span className="sim-map-pos">
            {sim.currentPosition.lat.toFixed(5)}, {sim.currentPosition.lng.toFixed(5)}
          </span>
        )}
      </div>
    </div>
  );
};

export default RoutePreviewMap;