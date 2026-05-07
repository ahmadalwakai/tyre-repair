import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import { wasRecentlySent } from '@/lib/admin/recently-sent';
import { sendAdminSms } from '@/lib/sms/admin-sms';
import { siteConfig } from '@/lib/site-config';
import {
  createLocationCaptureToken,
  LOCATION_TOKEN_EXPIRY_MINUTES,
} from '@/lib/security/location-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();
const RECENT_WINDOW_SECONDS = 90;

const bodySchema = z.object({
  channel: z.enum(['sms']).default('sms'),
  force: z.boolean().optional(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ bookingId: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { bookingId } = await context.params;
  if (!idSchema.safeParse(bookingId).success) {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  if (!parsed.data.force) {
    const recent = await wasRecentlySent({
      bookingId,
      action: 'booking.location_request.sent',
      withinSeconds: RECENT_WINDOW_SECONDS,
    });
    if (recent.alreadySentRecently) {
      return NextResponse.json({
        success: true,
        sentSms: false,
        sentEmail: false,
        alreadySentRecently: true,
        lastSentAt: recent.lastSentAt,
        message:
          recent.message ??
          'A location request was sent for this booking in the last minute. Pass force=true to send again.',
      });
    }
  }

  const rows = await db
    .select({
      id: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      customerName: schema.customers.fullName,
      customerEmail: schema.customers.email,
      customerPhone: schema.customers.phone,
    })
    .from(schema.bookings)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl).replace(/\/$/, '');

  let sentSms = false;
  let smsSkippedReason: 'missing_credentials' | 'send_failed' | 'no_phone' | undefined;

  if (!row.customerPhone) {
    smsSkippedReason = 'no_phone';
  } else {
    const created = await createLocationCaptureToken({
      method: 'sms',
      phone: row.customerPhone,
    });
    const link = `${baseUrl}/location-capture/${created.token}`;
    const body = `TyreRepair UK: please share your location so we can find you quickly: ${link} (valid ${LOCATION_TOKEN_EXPIRY_MINUTES} minutes).`;
    const r = await sendAdminSms({ phone: row.customerPhone, body });
    sentSms = r.sent;
    if (!r.sent && r.skippedReason) smsSkippedReason = r.skippedReason;
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'booking.location_request.sent',
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: {
      channel: parsed.data.channel,
      sentSms,
    },
  });

  return NextResponse.json({
    success: true,
    sentSms,
    smsSkippedReason,
    expiresInMinutes: LOCATION_TOKEN_EXPIRY_MINUTES,
  });
}
