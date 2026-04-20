// src/features/admin/pages/NotificationsPage/SendToUserPanel.tsx
import React from 'react';
import { Search, X, User, Send } from 'lucide-react';
import NotifTypeSelector from './NotifTypeSelector';
import type { SendToUserForm, UserSearchResult } from './types';

interface Props {
  userQuery:     string;
  onQueryChange: (v: string) => void;
  userResults:   UserSearchResult[];
  userSearching: boolean;
  selectedUser:  UserSearchResult | null;
  onSelectUser:  (u: UserSearchResult) => void;
  onClearUser:   () => void;
  form:          SendToUserForm;
  onFormChange:  (f: SendToUserForm) => void;
  onSend:        () => void;
  sending:       boolean;
}

const SendToUserPanel: React.FC<Props> = ({
  userQuery, onQueryChange,
  userResults, userSearching,
  selectedUser, onSelectUser, onClearUser,
  form, onFormChange,
  onSend, sending,
}) => {
  const canSend = !!form.user_id && form.title.trim().length > 0 && form.message.trim().length > 0;

  return (
    <div className="notif-panel">

      {/* Step 1 — pick user */}
      <div className="notif-step">
        <p className="notif-step-label">
          <span className="notif-step-num">1</span>
          Pick recipient
        </p>

        {selectedUser ? (
          <div className="notif-selected-user">
            <div className="notif-user-avatar">
              {selectedUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="notif-user-info">
              <span className="notif-user-name">{selectedUser.name}</span>
              <span className="notif-user-email">{selectedUser.email}</span>
            </div>
            <span className={`notif-role-chip notif-role-${selectedUser.role}`}>
              {selectedUser.role}
            </span>
            <button
              className="notif-clear-user"
              onClick={onClearUser}
              aria-label="Remove selected user"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="notif-search-wrap">
            <Search size={13} className="notif-search-icon" />
            <input
              id="notif-user-search"
              className="notif-search"
              placeholder="Search by name or email…"
              title="Search for a user"
              value={userQuery}
              onChange={(e) => onQueryChange(e.target.value)}
              autoComplete="off"
            />
            {userQuery && (
              <button
                className="notif-search-clear"
                onClick={() => onQueryChange('')}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
            {(userResults.length > 0 || userSearching) && (
              <div className="notif-dropdown" role="listbox" aria-label="User search results">
                {userSearching ? (
                  <div className="notif-dropdown-loading">
                    <span className="notif-spinner" /> Searching…
                  </div>
                ) : (
                  userResults.map((u) => (
                    <button
                      key={u.id}
                      className="notif-dropdown-row"
                      role="option"
                      aria-selected={false}
                      onClick={() => {
                        onSelectUser(u);
                        onFormChange({ ...form, user_id: u.id });
                      }}
                    >
                      <div className="notif-user-avatar notif-user-avatar-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="notif-user-info">
                        <span className="notif-user-name">{u.name}</span>
                        <span className="notif-user-email">{u.email}</span>
                      </div>
                      <span className={`notif-role-chip notif-role-${u.role}`}>{u.role}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2 — compose */}
      <div className="notif-step">
        <p className="notif-step-label">
          <span className="notif-step-num">2</span>
          Compose message
        </p>

        <div className="notif-field">
          <label htmlFor="notif-user-title" className="notif-label">Title</label>
          <input
            id="notif-user-title"
            className="notif-input"
            placeholder="Notification title"
            title="Notification title"
            value={form.title}
            onChange={(e) => onFormChange({ ...form, title: e.target.value })}
          />
        </div>

        <div className="notif-field">
          <label htmlFor="notif-user-message" className="notif-label">Message</label>
          <textarea
            id="notif-user-message"
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
        className="notif-send-btn"
        disabled={!canSend || sending}
        onClick={onSend}
      >
        {sending
          ? <><span className="notif-spinner white" /> Sending…</>
          : <><Send size={13} /> Send to {selectedUser?.name ?? 'User'}</>
        }
      </button>
    </div>
  );
};

export default SendToUserPanel;