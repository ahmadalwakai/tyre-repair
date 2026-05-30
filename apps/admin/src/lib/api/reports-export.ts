import { Linking, Platform, Share } from 'react-native';
import { getToken } from '@/lib/auth/session';

function resolveBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const apiPort = process.env.EXPO_PUBLIC_API_PORT ?? '3000';
    return `${window.location.protocol}//${window.location.hostname}:${apiPort}`;
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.tyrerepair.uk';
}

export type ReportExportKind = 'today';

const REPORT_PATHS: Record<ReportExportKind, string> = {
  today: '/api/admin/reports/today/export',
};

export interface ReportExportResult {
  ok: boolean;
  /** CSV body as text (always available on success). */
  csv: string;
  /** Filesystem URI if the platform supports file persistence. */
  fileUri: string | null;
  /** True when the Web platform handled download via the browser. */
  webDownloadHandled: boolean;
}

/**
 * Fetch a daily CSV report and persist/share it.
 *
 * Strategy:
 *  - Web: trigger a browser download via blob URL.
 *  - Native: write to documentDirectory and call Share. If Share fails the
 *    raw CSV string is still returned so the caller can show / copy it.
 *
 * Honest fallback: if expo-sharing is missing (it is not currently installed)
 * we use the built-in React Native Share API, which works on Android.
 */
export async function exportReport(
  kind: ReportExportKind,
): Promise<ReportExportResult> {
  const url = `${resolveBaseUrl()}${REPORT_PATHS[kind]}`;
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }
  const csv = await res.text();
  const filename = `tyrerepair-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      return { ok: true, csv, fileUri: null, webDownloadHandled: true };
    }
    return { ok: true, csv, fileUri: null, webDownloadHandled: false };
  }

  // Native: no file persistence (avoids the expo-file-system API churn).
  // The Share dialog accepts the CSV text directly. Operators can paste
  // into email / WhatsApp / Drive. PDF + on-disk file export are deferred.
  const fileUri: string | null = null;
  try {
    await Share.share({ message: csv, title: filename });
  } catch {
    // Final fallback: open as data URL via Linking so the user at least sees it.
    try {
      const data = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
      await Linking.openURL(data);
    } catch {
      /* swallow — caller can still display the csv string */
    }
  }

  return { ok: true, csv, fileUri, webDownloadHandled: false };
}
