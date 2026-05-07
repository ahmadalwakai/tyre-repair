import type { RealtimeEvent } from '@tyrerepair/realtime';
import { db, schema } from '@tyrerepair/db';
import { sendExpoPushMessages } from './expo';
import { buildAdminNotificationForEvent } from './templates';
import { getActiveAdminPushTokens } from './push-tokens';
import { getAdminNotificationPreferences } from './preferences';
import type {
  AdminNotificationPreferences,
  AdminPushNotificationCategory,
  SendAdminNotificationForRealtimeEventInput,
  SendAdminNotificationResult,
} from './types';

const DEFAULT_SOUND = process.env.ADMIN_NOTIFICATION_DEFAULT_SOUND ?? 'admin-alert.mp3';

const PREF_FOR_CATEGORY: Record<AdminPushNotificationCategory, keyof AdminNotificationPreferences> = {
  'booking.created': 'bookingAlertsEnabled',
  'booking.status.updated': 'bookingAlertsEnabled',
  'payment.succeeded': 'bookingAlertsEnabled',
  'payment.failed': 'bookingAlertsEnabled',
  'payment.refunded': 'bookingAlertsEnabled',
  'stock.low': 'stockAlertsEnabled',
  'stock.updated': 'stockAlertsEnabled',
  'pricing.rules.updated': 'pricingAlertsEnabled',
  'pricing.override.updated': 'pricingAlertsEnabled',
  'visitor.updated': 'visitorAlertsEnabled',
  'callback.requested': 'bookingAlertsEnabled',
  'booking.adjustment.created': 'bookingAlertsEnabled',
  'booking.adjustment.paid': 'bookingAlertsEnabled',
  'lead.call.clicked': 'bookingAlertsEnabled',
  'payment.deposit.succeeded': 'bookingAlertsEnabled',
  'payment.balance.succeeded': 'bookingAlertsEnabled',
  'emergency_assist.created': 'bookingAlertsEnabled',
  'booking.checkout.started': 'bookingAlertsEnabled',
};

function emptyResult(category: AdminPushNotificationCategory | null): SendAdminNotificationResult {
  return { category, attempted: 0, sent: 0, skipped: 0, failed: 0, invalidTokens: [] };
}

/**
 * Dispatch admin push notifications for a single realtime event.
 *
 * Notification failures must never break the underlying business workflow —
 * callers should still wrap this call in try/catch as a final safety net.
 */
export async function sendAdminNotificationForRealtimeEvent(
  input: SendAdminNotificationForRealtimeEventInput,
): Promise<SendAdminNotificationResult> {
  const template = buildAdminNotificationForEvent({ event: input.event });
  if (!template) return emptyResult(null);

  const category = template.category;
  const tokens = await getActiveAdminPushTokens(
    input.onlyAdminId ? { adminId: input.onlyAdminId } : undefined,
  );

  // Persist a single broadcast inbox row so admins can review missed pushes.
  // adminId is left null to indicate broadcast; per-admin read state is tracked client-side.
  try {
    await db.insert(schema.adminNotifications).values({
      adminId: null,
      type: category,
      title: template.title,
      body: template.body,
      data: template.data as unknown as Record<string, unknown>,
    });
  } catch {
    // Inbox persistence must never break push delivery.
  }

  if (tokens.length === 0) return emptyResult(category);

  // Group tokens by admin so we can apply per-admin preferences and sound flags.
  const byAdmin = new Map<string, string[]>();
  for (const t of tokens) {
    const list = byAdmin.get(t.adminId) ?? [];
    list.push(t.expoPushToken);
    byAdmin.set(t.adminId, list);
  }

  let attempted = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  for (const [adminId, adminTokens] of byAdmin) {
    let prefs: AdminNotificationPreferences;
    try {
      prefs = await getAdminNotificationPreferences(adminId);
    } catch {
      skipped += adminTokens.length;
      continue;
    }
    if (!prefs.pushEnabled) {
      skipped += adminTokens.length;
      continue;
    }
    const prefKey = PREF_FOR_CATEGORY[category];
    if (!prefs[prefKey]) {
      skipped += adminTokens.length;
      continue;
    }

    attempted += adminTokens.length;
    try {
      const result = await sendExpoPushMessages({
        tokens: adminTokens,
        title: template.title,
        body: template.body,
        data: template.data,
        channelId: 'admin-alerts',
        sound: prefs.soundEnabled ? DEFAULT_SOUND : null,
        priority: 'high',
      });
      sent += result.sent;
      failed += result.failed;
      invalidTokens.push(...result.invalidTokens);
    } catch {
      failed += adminTokens.length;
    }
  }

  return { category, attempted, sent, skipped, failed, invalidTokens };
}

/**
 * Fire-and-forget wrapper used inside webhook/admin route handlers. Never throws,
 * always logs nothing sensitive, never blocks the parent workflow.
 */
export async function safeSendAdminNotification(event: RealtimeEvent): Promise<void> {
  try {
    await sendAdminNotificationForRealtimeEvent({ event });
  } catch {
    // Swallow — main workflow must not fail due to notification side-effects.
  }
}
