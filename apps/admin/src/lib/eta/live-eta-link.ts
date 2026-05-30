import { Platform, Share } from 'react-native';
import * as Sharing from 'expo-sharing';

function webBaseUrl(): string {
  return (
    process.env['EXPO_PUBLIC_WEB_BASE_URL'] ??
    process.env['EXPO_PUBLIC_API_BASE_URL'] ??
    'https://www.tyrerepair.uk'
  );
}

export function buildLiveEtaUrl(bookingId: string): string {
  const base = webBaseUrl().replace(/\/$/, '');
  return `${base}/eta/${encodeURIComponent(bookingId)}`;
}

/**
 * Shares a live ETA tracking link with the customer using the platform
 * share sheet (WhatsApp, SMS, copy, etc.).
 */
export async function shareLiveEtaLink(
  bookingId: string,
  customerName?: string | null,
): Promise<void> {
  const url = buildLiveEtaUrl(bookingId);
  const greeting = customerName ? `Hi ${customerName}, ` : '';
  const message = `${greeting}track your fitter's live ETA here: ${url}`;
  if (Platform.OS === 'web') {
    if (Sharing && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(url);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(message);
    }
    return;
  }
  await Share.share({ message, url });
}
