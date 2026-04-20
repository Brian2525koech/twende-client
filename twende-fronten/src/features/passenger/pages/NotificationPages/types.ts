// src/features/passenger/pages/NotificationsPage/types.ts

export type NotificationType = 'info' | 'success' | 'warning' | 'trip';

export type FilterTab = 'all' | 'unread' | 'trip' | 'info';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'trip',   label: 'Trips' },
  { key: 'info',   label: 'Info' },
];

export const typeConfig: Record<NotificationType, { color: string; bg: string; darkBg: string; icon: string }> = {
  trip:    { color: '#1D9E75', bg: 'rgba(29,158,117,0.10)',  darkBg: 'rgba(29,158,117,0.14)',  icon: '🚌' },
  success: { color: '#1D9E75', bg: 'rgba(29,158,117,0.08)',  darkBg: 'rgba(29,158,117,0.12)',  icon: '✓' },
  warning: { color: '#d97706', bg: 'rgba(245,158,11,0.10)',  darkBg: 'rgba(245,158,11,0.14)',  icon: '⚠' },
  info:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  darkBg: 'rgba(59,130,246,0.12)',  icon: 'ℹ' },
};

export const timeAgo = (dateStr: string): string => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};

export const groupByDate = (notifications: Notification[]): Record<string, Notification[]> => {
  const groups: Record<string, Notification[]> = {};
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  for (const n of notifications) {
    const d = new Date(n.created_at); d.setHours(0, 0, 0, 0);
    let key: string;
    if (d.getTime() === today.getTime())     key = 'Today';
    else if (d.getTime() === yesterday.getTime()) key = 'Yesterday';
    else key = d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' });

    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }
  return groups;
};