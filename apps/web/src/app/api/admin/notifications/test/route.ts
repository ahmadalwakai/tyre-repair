import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { sendExpoPushMessages } from '@/lib/notifications/expo';
import { getActiveAdminPushTokens } from '@/lib/notifications/push-tokens';
import { getAdminNotificationPreferences } from '@/lib/notifications/preferences';
import type { AdminPushDataPayload, NotificationScreenTarget } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  type: z.enum(['booking', 'stock', 'pricing']).default('booking'),
});

interface TestTemplate {
  title: string;
  body: string;
  screenTarget: NotificationScreenTarget;
  eventType: AdminPushDataPayload['eventType'];
}

const TEST_TEMPLATES: Record<'booking' | 'stock' | 'pricing', TestTemplate> = {
  booking: {
    title: 'Test emergency booking alert',
    body: 'This is a test admin booking notification.',
    screenTarget: 'bookings',
    eventType: 'booking.created',
  },
  stock: {
    title: 'Test low stock alert',
    body: 'This is a test stock notification.',
    screenTarget: 'stock',
    eventType: 'stock.low',
  },
  pricing: {
    title: 'Test pricing alert',
    body: 'This is a test pricing notification.',
    screenTarget: 'pricing',
    eventType: 'pricing.rules.updated',
  },
};

const DEFAULT_SOUND = process.env.ADMIN_NOTIFICATION_DEFAULT_SOUND ?? 'admin-alert.mp3';

export async function POST(req: Request): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const tpl = TEST_TEMPLATES[parsed.data.type];

  let prefs;
  try {
    prefs = await getAdminNotificationPreferences(admin.adminId);
  } catch {
    return NextResponse.json({ error: 'Could not load preferences' }, { status: 500 });
  }
  if (!prefs.pushEnabled) {
    return NextResponse.json({ attempted: 0, sent: 0, skipped: 1, failed: 0, invalidTokens: [] });
  }

  let tokens;
  try {
    tokens = await getActiveAdminPushTokens({ adminId: admin.adminId });
  } catch {
    return NextResponse.json({ error: 'Could not load tokens' }, { status: 500 });
  }
  if (tokens.length === 0) {
    return NextResponse.json({ attempted: 0, sent: 0, skipped: 0, failed: 0, invalidTokens: [] });
  }

  const data: AdminPushDataPayload = {
    eventType: tpl.eventType,
    screenTarget: tpl.screenTarget,
    createdAt: new Date().toISOString(),
  };

  try {
    const result = await sendExpoPushMessages({
      tokens: tokens.map((t) => t.expoPushToken),
      title: tpl.title,
      body: tpl.body,
      data,
      channelId: 'admin-alerts',
      sound: prefs.soundEnabled ? DEFAULT_SOUND : null,
      priority: 'high',
    });
    return NextResponse.json({ ...result, skipped: 0 });
  } catch {
    return NextResponse.json({ error: 'Could not send test notification' }, { status: 500 });
  }
}
