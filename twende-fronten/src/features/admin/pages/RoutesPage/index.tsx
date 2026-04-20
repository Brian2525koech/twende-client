// src/features/admin/pages/RoutesPage/index.tsx
import React, { useState } from 'react';
import {
  Route as RouteIcon, Plus, Search,
  Sun, Moon, RefreshCw, Filter,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminRoutes } from './useAdminRoutes';
import RouteCard from './RouteCard';
import RouteFormModal from './RouteFormModal';
import StopFormModal from './StopFormModal';
import AdminBottomNav from '../../components/AdminBottomNav';
import type { AdminRoute, RouteStop, StopFormData } from './types';
import './adminRoutes.css';

type ModalState =
  | { type: 'none' }
  | { type: 'addRoute' }
  | { type: 'editRoute'; route: AdminRoute }
  | { type: 'addStop'; routeId: number; routeName: string }
  | { type: 'editStop'; stop: RouteStop; routeId: number; routeName: string };

const AdminRoutesPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  const {
    cities,
    loading,
    expandedRouteId,
    stopsLoading,
    geometryLoading,
    cityFilter,
    setCityFilter,
    searchQuery,
    setSearchQuery,
    toggleExpand,
    createRoute,
    updateRoute,
    deleteRoute,
    addStop,
    updateStop,
    deleteStop,
    reorderStop,
    loadGeometry,
    refresh,
    filteredRoutes,
  } = useAdminRoutes();

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleAddStop = (routeId: number, _initial: StopFormData) => {
    const route = filteredRoutes.find((r) => r.id === routeId);
    if (!route) return;
    setModal({ type: 'addStop', routeId, routeName: route.name });
  };

  const handleEditStop = (stop: RouteStop, routeId: number) => {
    const route = filteredRoutes.find((r) => r.id === routeId);
    if (!route) return;
    setModal({ type: 'editStop', stop, routeId, routeName: route.name });
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rte-page">
        <div className="rte-loading">
          <div className="rte-loading-icon">
            <RouteIcon size={28} strokeWidth={2} className="rte-loading-spinner-icon" />
          </div>
          <p className="rte-loading-text">Loading routes…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rte-page">
      {/* ── HEADER ── */}
      <header className="rte-header">
        <div className="rte-header-inner">
          {/* Brand */}
          <div className="rte-brand">
            <div className="rte-brand-icon">
              <RouteIcon size={17} className="rte-brand-icon-svg" strokeWidth={2.5} />
            </div>
            <div>
              <p className="rte-brand-name">
                TWENDE<span className="rte-brand-dot">.</span>
                <span className="rte-brand-tag">ROUTES</span>
              </p>
              <p className="rte-brand-sub">
                {filteredRoutes.length} route{filteredRoutes.length !== 1 ? 's' : ''} · {cities.length} cities
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="rte-header-controls">
            <button
              className="rte-add-btn"
              onClick={() => setModal({ type: 'addRoute' })}
              aria-label="Add route"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add Route</span>
            </button>
            <button onClick={refresh} className="adm-icon-btn" aria-label="Refresh">
              <RefreshCw size={15} strokeWidth={2.5} />
            </button>
            <button onClick={toggleTheme} className="adm-icon-btn" aria-label="Toggle theme">
              {theme === 'dark'
                ? <Sun size={15} className="adm-sun" />
                : <Moon size={15} className="adm-moon" />
              }
            </button>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="rte-filter-bar">
          <div className="rte-search-wrap">
            <Search size={13} strokeWidth={2.5} className="rte-search-icon" />
            <input
              className="rte-search-input"
              type="text"
              placeholder="Search routes…"
              aria-label="Search routes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rte-city-filter-wrap">
            <Filter size={12} strokeWidth={2.5} className="rte-filter-icon" />
            <select
              className="rte-city-select"
              title="Filter by city"
              aria-label="Filter by city"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            >
              <option value="all">All Cities</option>
              {cities.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="rte-main">
        {filteredRoutes.length === 0 ? (
          <div className="rte-empty">
            <RouteIcon size={34} strokeWidth={1.2} className="rte-empty-icon" />
            <p className="rte-empty-title">
              {searchQuery || cityFilter !== 'all'
                ? 'No routes match your filters'
                : 'No routes yet'}
            </p>
            <p className="rte-empty-sub">
              {searchQuery || cityFilter !== 'all'
                ? 'Try adjusting the search or city filter'
                : 'Create your first route to get started'}
            </p>
            {!searchQuery && cityFilter === 'all' && (
              <button
                className="rte-empty-cta"
                onClick={() => setModal({ type: 'addRoute' })}
              >
                <Plus size={13} strokeWidth={2.5} />
                Add First Route
              </button>
            )}
          </div>
        ) : (
          <div className="rte-route-list">
            {filteredRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                isExpanded={expandedRouteId === route.id}
                stopsLoading={stopsLoading}
                geometryLoading={geometryLoading}
                onToggle={() => toggleExpand(route.id)}
                onEdit={(r) => setModal({ type: 'editRoute', route: r })}
                onDelete={deleteRoute}
                onAddStop={handleAddStop}
                onEditStop={handleEditStop}
                onDeleteStop={deleteStop}
                onReorderStop={reorderStop}
                onViewGeometry={loadGeometry}
              />
            ))}
          </div>
        )}

        <div className="rte-bottom-spacer" />
      </main>

      {/* ── MODALS ── */}
      {modal.type === 'addRoute' && (
        <RouteFormModal
          mode="add"
          cities={cities}
          onConfirm={createRoute}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'editRoute' && (
        <RouteFormModal
          mode="edit"
          route={modal.route}
          cities={cities}
          onConfirm={(data) => updateRoute(modal.route.id, data)}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'addStop' && (
        <StopFormModal
          mode="add"
          routeName={modal.routeName}
          onConfirm={(data) => addStop(modal.routeId, data)}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'editStop' && (
        <StopFormModal
          mode="edit"
          stop={modal.stop}
          routeName={modal.routeName}
          onConfirm={(data) => updateStop(modal.stop.id, modal.routeId, data)}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      <AdminBottomNav />
    </div>
  );
};

export default AdminRoutesPage;