import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import { sendAdminSms } from '@/lib/sms/admin-sms';
import { wasRecentlySent } from '@/lib/admin/recently-sent';
import { siteConfig } from '@/lib/site-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();
const bodySchema = z.object({
  sendFollowUpMessage: z.boolean().default(false),
  channel: z.enum(['sms', 'whatsapp', 'none']).default('sms'),
  note: z.string().trim().max(500).optional(),
});

const RECENT_WINDOW_SECONDS = 60;

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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const recent = await wasRecentlySent({
    bookingId,
    action: 'booking.no_answer.marked',
    withinSeconds: RECENT_WINDOW_SECONDS,
  });

  const rows = await db
    .select({
      id: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      customerName: schema.customers.fullName,
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

  let smsSent = false;
  let smsSkippedReason: 'missing_credentials' | 'send_failed' | 'no_phone' | 'channel_skipped' =
    'channel_skipped';
  let whatsappLink: string | null = null;

  if (parsed.data.sendFollowUpMessage) {
    if (parsed.data.channel === 'sms') {
      if (!row.customerPhone) {
        smsSkippedReason = 'no_phone';
      } else {
        const messageBody = `Hi, this is TyreRepair UK. We tried calling about your tyre request. Please call us back on ${siteConfig.phoneDisplay} or reply here when you are free.`;
        const r = await sendAdminSms({ phone: row.customerPhone, body: messageBody });
        smsSent = r.sent;
        if (!r.sent && r.skippedReason) smsSkippedReason = r.skippedReason;
      }
    } else if (parsed.data.channel === 'whatsapp') {
      if (row.customerPhone) {
        const cleanPhone = row.customerPhone.replace(/[^0-9]/g, '');
        const text = encodeURIComponent(
          `Hi, this is TyreRepair UK. We tried calling about your tyre request. Please reply when you are free or call ${siteConfig.phoneDisplay}.`,
        );
        whatsappLink = `https://wa.me/${cleanPhone}?text=${text}`;
      }
    }
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'booking.no_answer.marked',
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: {
      sendFollowUpMessage: parsed.data.sendFollowUpMessage,
      channel: parsed.data.channel,
      smsSent,
      noteIncluded: !!parsed.data.note,
    },
  });

  if (parsed.data.note) {
    try {
      await db.insert(schema.bookingInternalNotes).values({
        bookingId,
        adminId: admin.adminId,
        noteType: 'ISSUE',
        body: `[No answer] ${parsed.data.note}`,
      });
    } catch {
      /* swallow */
    }
  }

  // Notify admins via inbox so other admins can see this lead is at risk
  try {
    await db.insert(schema.adminNotifications).values({
      type: 'booking.no_answer',
      priority: 'high',
      title: `No answer — ${row.trackingId}`,
      body: `${row.customerName ?? 'Customer'} did not answer. Try again or send SMS.`,
      bookingId,
      trackingId: row.trackingId,
      actionTarget: `/bookings/${bookingId}`,
    });
  } catch {
    /* swallow */
  }

  return NextResponse.json({
    success: true,
    smsSent,
    smsSkippedReason: smsSkippedReason === 'channel_skipped' ? undefined : smsSkippedReason,
    whatsappLink,
    alreadyMarkedRecently: recent.alreadySentRecently,
    lastMarkedAt: recent.lastSentAt,
  });
}
