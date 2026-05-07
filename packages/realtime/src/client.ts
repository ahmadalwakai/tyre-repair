import PusherClient from 'pusher-js';

let cachedClient: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (cachedClient) return cachedClient;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'eu';
  if (!key) {
    throw new Error('NEXT_PUBLIC_PUSHER_KEY is required to instantiate browser Pusher client');
  }

  cachedClient = new PusherClient(key, {
    cluster,
    forceTLS: true,
    authEndpoint: '/api/pusher/auth',
  });
  return cachedClient;
}
