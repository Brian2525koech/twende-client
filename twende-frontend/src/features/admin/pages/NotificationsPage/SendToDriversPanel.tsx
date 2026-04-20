// src/features/admin/pages/NotificationsPage/SendToDriversPanel.tsx
import React from 'react';
import { Send, Bus } from 'lucide-react';
import NotifTypeSelector from './NotifTypeSelector';
import type { SendToDriversForm } from './types';

interface Props {
  form:        SendToDriversForm;
  onFormChange:(f: SendToDriversForm) => void;
  onSend:      () => void;
  sending:     boolean;
}

const SendToDriversPanel: React.FC<Props> = ({ form, onFormChange, onSend, sending }) => {
  const canSend = form.title.trim().length > 0 && form.message.trim().length > 0;

  return (
    <div className="notif-panel">

      {/* Info banner */}
      <div className="notif-drivers-banner">
        <Bus size={16} strokeWidth={2} className="notif-drivers-icon" />
        <div>
          <p className="notif-drivers-banner-title">All Drivers</p>
          <p className="notif-drivers-banner-sub">
            This notification will be sent to every user with the driver role
          </p>
        </div>
      </div>

      {/* Compose */}
      <div className="notif-step">
        <p className="notif-step-label">
          <span className="notif-step-num">1</span>
          Compose message
        </p>

        <div className="notif-field">
          <label htmlFor="notif-drivers-title" className="notif-label">Title</label>
          <input
            id="notif-drivers-title"
            className="notif-input"
            placeholder="e.g. Important update for drivers"
            title="Notification title"
            value={form.title}
            onChange={(e) => onFormChange({ ...form, title: e.target.value })}
          />
        </div>

        <div className="notif-field">
          <label htmlFor="notif-drivers-message" className="notif-label">Message</label>
          <textarea
            id="notif-drivers-message"
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
        className="notif-send-btn notif-send-drivers"
        disabled={!canSend || sending}
        onClick={onSend}
      >
        {sending
          ? <><span className="notif-spinner white" /> Broadcasting…</>
          : <><Send size={13} /> Broadcast to All Drivers</>
        }
      </button>
    </div>
  );
};

export default SendToDriversPanel;