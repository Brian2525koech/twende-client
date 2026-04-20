// src/features/admin/pages/RoutesPage/RouteCard.tsx
import React, { useState } from 'react';
import {
  ChevronDown, ChevronUp, Bus, MapPin,
  Pencil, Trash2, Plus, ArrowUp, ArrowDown,
  Map, Loader2,
} from 'lucide-react';
import type { AdminRoute, RouteStop, StopFormData } from './types';

interface Props {
  route: AdminRoute;
  isExpanded: boolean;
  stopsLoading: boolean;
  geometryLoading: number | null;
  onToggle: () => void;
  onEdit: (route: AdminRoute) => void;
  onDelete: (routeId: number) => void;
  onAddStop: (routeId: number, data: StopFormData) => void;
  onEditStop: (stop: RouteStop, routeId: number) => void;
  onDeleteStop: (stopId: number, routeId: number) => void;
  onReorderStop: (stopId: number, routeId: number, dir: 'up' | 'down') => void;
  onViewGeometry: (routeId: number) => void;
}

const RouteCard: React.FC<Props> = ({
  route,
  isExpanded,
  stopsLoading,
  geometryLoading,
  onToggle,
  onEdit,
  onDelete,
  onAddStop,
  onEditStop,
  onDeleteStop,
  onReorderStop,
  onViewGeometry,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteStop, setConfirmDeleteStop] = useState<number | null>(null);

  const sortedStops = [...(route.stops ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setConfirmDelete(false);
    onDelete(route.id);
  };

  const handleDeleteStop = (stopId: number) => {
    if (confirmDeleteStop !== stopId) { setConfirmDeleteStop(stopId); return; }
    setConfirmDeleteStop(null);
    onDeleteStop(stopId, route.id);
  };

  // Dynamic DB colour is passed as a CSS custom property — the only sanctioned
  // pattern for dynamic colours in this codebase (same as sim-route-dot
  // background and sim-progress-fill width in the dashboard).
  const colourVar = { '--rte-route-colour': route.colour } as React.CSSProperties;

  return (
    <div
      className={`rte-card${isExpanded ? ' rte-card-expanded' : ''}`}
      style={colourVar}
    >
      {/* Colour strip — uses var(--rte-route-colour) in CSS */}
      <div className="rte-card-strip" />

      {/* ── Card header row ── */}
      <div className="rte-card-header" onClick={onToggle}>
        <div className="rte-card-left">
          {/* Dot — colour via var(--rte-route-colour) in CSS */}
          <div className="rte-route-dot" />
          <div className="rte-card-info">
            <p className="rte-card-name">{route.name}</p>
            <div className="rte-card-meta">
              <span className="rte-meta-city">{route.city_name}</span>
              <span className="rte-meta-sep">·</span>
              <MapPin size={10} strokeWidth={2.5} className="rte-meta-icon" />
              <span>{route.stop_count} stops</span>
              <span className="rte-meta-sep">·</span>
              <Bus size={10} strokeWidth={2.5} className="rte-meta-icon" />
              <span>{route.active_driver_count} drivers</span>
            </div>
            {route.description && (
              <p className="rte-card-desc">{route.description}</p>
            )}
          </div>
        </div>

        {/* Right: actions + chevron */}
        <div className="rte-card-right" onClick={(e) => e.stopPropagation()}>
          <button
            className="rte-icon-btn rte-btn-edit"
            onClick={() => onEdit(route)}
            aria-label="Edit route"
          >
            <Pencil size={13} strokeWidth={2.5} />
          </button>
          <button
            className={`rte-icon-btn${confirmDelete ? ' rte-btn-confirm-del' : ' rte-btn-del'}`}
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
            aria-label="Delete route"
          >
            <Trash2 size={13} strokeWidth={2.5} />
          </button>
          <div className="rte-chevron" onClick={onToggle}>
            {isExpanded
              ? <ChevronUp size={16} strokeWidth={2.5} />
              : <ChevronDown size={16} strokeWidth={2.5} />
            }
          </div>
        </div>
      </div>

      {/* ── Expanded stop editor ── */}
      {isExpanded && (
        <div className="rte-stop-editor">
          <div className="rte-stop-editor-header">
            <p className="rte-stop-editor-label">
              <MapPin size={11} strokeWidth={2.5} />
              Stop Order
            </p>
            <div className="rte-stop-editor-actions">
              <button
                className="rte-geo-btn"
                onClick={() => onViewGeometry(route.id)}
                disabled={geometryLoading === route.id}
              >
                {geometryLoading === route.id
                  ? <Loader2 size={11} strokeWidth={2.5} className="rte-spin" />
                  : <Map size={11} strokeWidth={2.5} />
                }
                Preview Path
              </button>
              <button
                className="rte-add-stop-btn"
                onClick={() => onAddStop(route.id, { name: '', lat: '', lng: '' })}
              >
                <Plus size={12} strokeWidth={2.5} />
                Add Stop
              </button>
            </div>
          </div>

          {stopsLoading ? (
            <div className="rte-stops-loading">
              <Loader2 size={18} strokeWidth={2} className="rte-spin" />
              <span>Loading stops…</span>
            </div>
          ) : sortedStops.length === 0 ? (
            <div className="rte-stops-empty">
              <MapPin size={22} strokeWidth={1.3} className="rte-stops-empty-icon" />
              <p>No stops yet — add the first one</p>
            </div>
          ) : (
            <div className="rte-stop-list">
              {sortedStops.map((stop, idx) => (
                <div key={stop.id} className="rte-stop-row">
                  {/* Index badge — background via var(--rte-route-colour) in CSS */}
                  <div className="rte-stop-index">{idx + 1}</div>

                  {/* Connector line — border-color via var(--rte-route-colour) in CSS */}
                  {idx < sortedStops.length - 1 && (
                    <div className="rte-stop-line" />
                  )}

                  <div className="rte-stop-info">
                    <p className="rte-stop-name">{stop.name}</p>
                    <p className="rte-stop-coords">
                      {Number(stop.lat).toFixed(5)}, {Number(stop.lng).toFixed(5)}
                    </p>
                  </div>

                  <div className="rte-stop-actions">
                    <button
                      className="rte-stop-icon-btn"
                      onClick={() => onReorderStop(stop.id, route.id, 'up')}
                      disabled={idx === 0}
                      aria-label="Move up"
                    >
                      <ArrowUp size={11} strokeWidth={2.5} />
                    </button>
                    <button
                      className="rte-stop-icon-btn"
                      onClick={() => onReorderStop(stop.id, route.id, 'down')}
                      disabled={idx === sortedStops.length - 1}
                      aria-label="Move down"
                    >
                      <ArrowDown size={11} strokeWidth={2.5} />
                    </button>
                    <button
                      className="rte-stop-icon-btn rte-stop-edit"
                      onClick={() => onEditStop(stop, route.id)}
                      aria-label="Edit stop"
                    >
                      <Pencil size={11} strokeWidth={2.5} />
                    </button>
                    <button
                      className={`rte-stop-icon-btn${
                        confirmDeleteStop === stop.id
                          ? ' rte-stop-del-confirm'
                          : ' rte-stop-del'
                      }`}
                      onClick={() => handleDeleteStop(stop.id)}
                      onBlur={() => setConfirmDeleteStop(null)}
                      aria-label="Delete stop"
                    >
                      <Trash2 size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteCard;