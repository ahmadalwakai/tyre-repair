import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import type { AdminNotificationPreferenceState } from './types';

interface PreferencesResponse {
  preferences: AdminNotificationPreferenceState;
}

export function getAdminNotificationPreferences(): Promise<PreferencesResponse> {
  return apiGet<PreferencesResponse>('/api/admin/notifications/preferences');
}

export function patchAdminNotificationPreferences(
  prefs: Partial<AdminNotificationPreferenceState>,
): Promise<PreferencesResponse> {
  return apiPatch<PreferencesResponse>('/api/admin/notifications/preferences', prefs);
}

export function registerAdminPushTokenOnServer(input: {
  expoPushToken: string;
  deviceName?: string;
  appVersion?: string;
  nativeBuildVersion?: string;
}): Promise<{ success: boolean; tokenId: string }> {
  return apiPost<{ success: boolean; tokenId: string }>(
    '/api/admin/notifications/register-token',
    {
      expoPushToken: input.expoPushToken,
      platform: 'android',
      deviceName: input.deviceName,
      appVersion: input.appVersion,
      nativeBuildVersion: input.nativeBuildVersion,
    },
  );
}

export function unregisterAdminPushTokenOnServer(input: {
  expoPushToken: string;
}): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>('/api/admin/notifications/unregister-token', input);
}

export function sendAdminTestNotification(
  type: 'booking' | 'stock' | 'pricing',
): Promise<{ attempted: number; sent: number; failed: number; skipped: number; invalidTokens: string[] }> {
  return apiPost<{
    attempted: number;
    sent: number;
    failed: number;
    skipped: number;
    invalidTokens: string[];
  }>('/api/admin/notifications/test', { type });
}
