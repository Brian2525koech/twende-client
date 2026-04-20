// src/features/admin/pages/NotificationsPage/SendToRoutePanel.tsx
import React from 'react';
import { Send, ChevronDown } from 'lucide-react';
import NotifTypeSelector from './NotifTypeSelector';
import type { SendToRouteForm, RouteOption } from './types';

/* Route colour dot — DB-driven hex must stay as inline style.
   Same documented exception as sim-route-dot in adminDashboard.css. */
interface RouteDotProps { colour: string }
const RouteDot: React.FC<RouteDotProps> = ({ colour }) => (
  <span className="notif-route-dot" style={{ background: colour }} />
);

interface Props {
  routes:      RouteOption[];
  form:        SendToRouteForm;
  onFormChange:(f: SendToRouteForm) => void;
  onSend:      () => void;
  sending:     boolean;
}

const SendToRoutePanel: React.FC<Props> = ({
  routes, form, onFormChange, onSend, sending,
}) => {
  const canSend = form.route_id !== '' && form.title.trim().length > 0 && form.message.trim().length > 0;
  const selectedRoute = routes.find((r) => r.id === form.route_id);

  return (
    <div className="notif-panel">

      {/* Step 1 — pick route */}
      <div className="notif-step">
        <p className="notif-step-label">
          <span className="notif-step-num">1</span>
          Select route
        </p>
        <div className="notif-select-wrap">
          {selectedRoute && <RouteDot colour={selectedRoute.colour} />}
          <select
            id="notif-route-select"
            className={`notif-select${form.route_id !== '' ? ' notif-select-active' : ''}`}
            title="Select a route"
            value={form.route_id}
            onChange={(e) => onFormChange({
              ...form,
              route_id: e.target.value ? Number(e.target.value) : '',
            })}
          >
            <option value="">Choose a route…</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="notif-select-chevron" />
        </div>
        {selectedRoute && (
          <p className="notif-route-hint">
            Sends to all passengers who have ever used this route
          </p>
        )}
      </div>

      {/* Step 2 — compose */}
      <div className="notif-step">
        <p className="notif-step-label">
          <span className="notif-step-num">2</span>
          Compose message
        </p>

        <div className="notif-field">
          <label htmlFor="notif-route-title" className="notif-label">Title</label>
          <input
            id="notif-route-title"
            className="notif-input"
            placeholder="e.g. Route update"
            title="Notification title"
            value={form.title}
            onChange={(e) => onFormChange({ ...form, title: e.target.value })}
          />
        </div>

        <div className="notif-field">
          <label htmlFor="notif-route-message" className="notif-label">Message</label>
          <textarea
            id="notif-route-message"
            className="notif-textarea"
            placeholder="Write your message…"
            title="Notification message"
            rows={3}
            value={form.message}
            onChange={(e) => onFormChange({ ...form, message: e.target.value })}
          />
        </div>

        <div className="notif-field">
          <p className="notif-label">Type</p>
          <NotifTypeSelector
            value={form.type}
            onChange={(t) => onFormChange({ ...form, type: t })}
          />
        </div>
      </div>

      <button
        className="notif-send-btn notif-send-route"
        disabled={!canSend || sending}
        onClick={onSend}
      >
        {sending
          ? <><span className="notif-spinner white" /> Broadcasting…</>
          : <><Send size={13} /> Broadcast to Route Passengers</>
        }
      </button>
    </div>
  );
};

export default SendToRoutePanel;