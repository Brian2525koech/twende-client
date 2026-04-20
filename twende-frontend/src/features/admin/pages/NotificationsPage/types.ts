// src/features/admin/pages/NotificationsPage/types.ts

export type NotifType = 'info' | 'success' | 'warning' | 'trip';

export type SendMode = 'user' | 'route' | 'drivers';

export interface UserSearchResult {
  id:    number;
  name:  string;
  email: string;
  role:  string;
}

export interface RouteOption {
  id:     number;
  name:   string;
  colour: string;
}

export interface BroadcastRecord {
  id:              number;
  mode:            SendMode;
  title:           string;
  message:         string;
  type:            NotifType;
  recipient_label: string;
  recipient_count: number;
  sent_at:         string;
}

export interface SendToUserForm {
  user_id:  number | null;
  title:    string;
  message:  string;
  type:     NotifType;
}

export interface SendToRouteForm {
  route_id: number | '';
  title:    string;
  message:  string;
  type:     NotifType;
}

export interface SendToDriversForm {
  title:   string;
  message: string;
  type:    NotifType;
}