import { apiGet, apiPost } from './client';
import type { NotificationInboxResponse, InboxFilterType } from '@/types/notifications';

export interface InboxFilter {
  unread?: boolean;
  highPriority?: boolean;
  handled?: boolean;
  type?: InboxFilterType;
  limit?: number;
}

export async function getInbox(
  filter: InboxFilter = {},
  signal?: AbortSignal,
): Promise<NotificationInboxResponse> {
  const params = new URLSearchParams();
  if (filter.unread != null) params.set('unread', String(filter.unread));
  if (filter.highPriority != null) params.set('highPriority', String(filter.highPriority));
  if (filter.handled != null) params.set('handled', String(filter.handled));
  if (filter.type) params.set('type', filter.type);
  if (filter.limit) params.set('limit', String(filter.limit));
  const qs = params.toString();
  return apiGet<NotificationInboxResponse>(
    `/api/admin/notifications/inbox${qs ? `?${qs}` : ''}`,
    signal ? { signal } : undefined,
  );
}

export async function markAllRead(): Promise<{ success: true }> {
  return apiPost<{ success: true }>('/api/admin/notifications/inbox', {});
}

export async function markRead(id: string): Promise<{ success: true }> {
  return apiPost<{ success: true }>(`/api/admin/notifications/${id}/read`, {});
}

export async function markHandled(id: string): Promise<{ success: true }> {
  return apiPost<{ success: true }>(`/api/admin/notifications/${id}/handled`, {});
}
