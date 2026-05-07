import Pusher from 'pusher';
import type { RealtimeEvent } from './events';

let cachedServer: Pusher | null = null;

interface PusherServerEnv {
  appId: string;
  key: string;
  secret: string;
  cluster: string;
}

function readServerEnv(): PusherServerEnv {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER ?? 'eu';

  if (!appId || !key || !secret) {
    throw new Error(
      'Pusher server env missing: require PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET',
    );
  }
  return { appId, key, secret, cluster };
}

export function getPusherServer(): Pusher {
  if (cachedServer) return cachedServer;
  const env = readServerEnv();
  cachedServer = new Pusher({
    appId: env.appId,
    key: env.key,
    secret: env.secret,
    cluster: env.cluster,
    useTLS: true,
  });
  return cachedServer;
}

export async function triggerRealtimeEvent(
  channel: string,
  event: RealtimeEvent,
): Promise<void> {
  const server = getPusherServer();
  await server.trigger(channel, event.type, event);
}

/**
 * Server-side helper to authenticate Pusher private channels.
 * Pusher's authorize() requires only the public key + secret, never exposed to client.
 */
export function authorizePusherChannel(socketId: string, channel: string): { auth: string } {
  const server = getPusherServer();
  return server.authorizeChannel(socketId, channel);
}
