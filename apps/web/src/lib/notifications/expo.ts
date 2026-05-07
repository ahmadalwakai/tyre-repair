import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { deactivateInvalidExpoPushTokens } from './push-tokens';
import type { SendExpoPushMessagesInput, SendExpoPushMessagesResult } from './types';

let expoSingleton: Expo | null = null;

export function getExpoPushService(): Expo {
  if (!expoSingleton) {
    const accessToken = process.env.EXPO_ACCESS_TOKEN;
    expoSingleton =
      accessToken && accessToken.length > 0 ? new Expo({ accessToken }) : new Expo();
  }
  return expoSingleton;
}

export async function sendExpoPushMessages(
  input: SendExpoPushMessagesInput,
): Promise<SendExpoPushMessagesResult> {
  const enabled = (process.env.EXPO_PUSH_ENABLED ?? 'true').toLowerCase() !== 'false';
  if (!enabled) {
    return { attempted: input.tokens.length, sent: 0, failed: 0, invalidTokens: [] };
  }

  const expo = getExpoPushService();

  const validTokens: string[] = [];
  const invalidTokens: string[] = [];
  for (const token of input.tokens) {
    if (Expo.isExpoPushToken(token)) {
      validTokens.push(token);
    } else {
      invalidTokens.push(token);
    }
  }

  if (validTokens.length === 0) {
    if (invalidTokens.length > 0) {
      try {
        await deactivateInvalidExpoPushTokens(invalidTokens);
      } catch {
        // ignore — best effort cleanup
      }
    }
    return {
      attempted: input.tokens.length,
      sent: 0,
      failed: invalidTokens.length,
      invalidTokens,
    };
  }

  const messages: ExpoPushMessage[] = validTokens.map((to) => {
    const msg: ExpoPushMessage = {
      to,
      title: input.title,
      body: input.body,
      data: input.data as unknown as Record<string, unknown>,
      channelId: input.channelId,
      priority: input.priority,
    };
    if (input.sound) {
      (msg as { sound?: ExpoPushMessage['sound'] }).sound = input.sound as ExpoPushMessage['sound'];
    }
    return msg;
  });

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];
  let failed = 0;
  for (const chunk of chunks) {
    try {
      const result = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...result);
    } catch {
      failed += chunk.length;
    }
  }

  let sent = 0;
  // Map tickets back to tokens by index across chunks (preserve original order).
  let cursor = 0;
  for (const ticket of tickets) {
    const tokenForTicket = validTokens[cursor] ?? null;
    cursor += 1;
    if (ticket.status === 'ok') {
      sent += 1;
      continue;
    }
    failed += 1;
    const errType = ticket.details?.error;
    if (errType === 'DeviceNotRegistered' && tokenForTicket) {
      invalidTokens.push(tokenForTicket);
    }
  }

  if (invalidTokens.length > 0) {
    try {
      await deactivateInvalidExpoPushTokens(invalidTokens);
    } catch {
      // ignore — best effort cleanup
    }
  }

  return {
    attempted: input.tokens.length,
    sent,
    failed,
    invalidTokens,
  };
}
