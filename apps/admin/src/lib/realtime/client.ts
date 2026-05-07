import Pusher, { type Channel } from 'pusher-js';
import { getToken } from '@/lib/auth/session';
import { apiBaseUrl } from '@/lib/api/client';

let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher | null {
  const key = process.env.EXPO_PUBLIC_PUSHER_KEY;
  const cluster = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? 'eu';
  if (!key) {
    console.warn(
      '[realtime] EXPO_PUBLIC_PUSHER_KEY is not set; admin realtime disabled',
    );
    return null;
  }
  if (pusherInstance) return pusherInstance;

  pusherInstance = new Pusher(key, {
    cluster,
    forceTLS: true,
    channelAuthorization: {
      endpoint: `${apiBaseUrl}/api/pusher/auth`,
      transport: 'ajax',
      headersProvider: () => {
        // pusher-js will call this synchronously; we need the token already
        return cachedHeaders;
      },
    },
  });
  return pusherInstance;
}

let cachedHeaders: Record<string, string> = {};

export async function refreshPusherAuthHeaders(): Promise<void> {
  const token = await getToken();
  cachedHeaders = token ? { Authorization: `Bearer ${token}` } : {};
}

export function disconnectPusher(): void {
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }
}

export function subscribePrivate(channelName: string): Channel | null {
  const pusher = getPusher();
  if (!pusher) return null;
  return pusher.subscribe(channelName);
}
