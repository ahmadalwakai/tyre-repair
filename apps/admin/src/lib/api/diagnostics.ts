/**
 * Admin Stability & Field Operations Pack — Part 1
 * Admin app — diagnostics API client.
 */
import { apiGet, apiPost } from './client';

export interface AdminDiagnosticsResponse {
  ok: boolean;
  timestamp: string;
  service: string;
  version: string;
  admin: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    permissions: string[];
  };
  database: { ok: boolean };
  realtime: {
    pusherKeyPresent: boolean;
    pusherSecretPresent: boolean;
    pusherClusterPresent: boolean;
    pusherAppIdPresent: boolean;
    publicKeyPresent: boolean;
    publicClusterPresent: boolean;
  };
  push: {
    expoAccessTokenPresent: boolean;
    defaultSoundConfigured: boolean;
  };
  storage: {
    configured: boolean;
    provider: string;
    missing: string[];
  };
  webEnv: {
    siteUrlPresent: boolean;
    adminJwtSecretPresent: boolean;
  };
}

export async function fetchAdminDiagnostics(signal?: AbortSignal): Promise<AdminDiagnosticsResponse> {
  return apiGet<AdminDiagnosticsResponse>('/api/admin/diagnostics', signal ? { signal } : undefined);
}

export interface SendTestNotificationResult {
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
}

export async function sendTestAdminNotification(): Promise<SendTestNotificationResult> {
  return apiPost<SendTestNotificationResult>('/api/admin/notifications/test', { type: 'booking' });
}
