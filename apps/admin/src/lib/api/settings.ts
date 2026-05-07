import { apiGet, apiPatch } from './client';
import type { NotificationPrefs } from '@/types/settings';
import type { AdminProfile } from '@/types/auth';

export function getProfile(): Promise<{ profile: AdminProfile }> {
  return apiGet<{ profile: AdminProfile }>('/api/admin/settings/profile');
}

export function patchProfile(fullName: string): Promise<{ profile: AdminProfile }> {
  return apiPatch<{ profile: AdminProfile }>('/api/admin/settings/profile', { fullName });
}

export function getNotificationPrefs(): Promise<{ preferences: NotificationPrefs }> {
  return apiGet<{ preferences: NotificationPrefs }>('/api/admin/settings/notifications');
}

export function patchNotificationPrefs(prefs: Partial<NotificationPrefs>): Promise<{
  preferences: NotificationPrefs;
}> {
  return apiPatch<{ preferences: NotificationPrefs }>('/api/admin/settings/notifications', prefs);
}
