import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import { sendPaymentLinkSms } from '@/lib/sms/payment-link';
import { sendPaymentLinkEmail } from '@/lib/email/payment-link';
import { siteConfig } from '@/lib/site-config';
import { wasRecentlySent } from '@/lib/admin/recently-sent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECENT_WINDOW_SECONDS = 90;

const idSchema = z.string().uuid();

const bodySchema = z
  .object({
    method: z.enum(['sms', 'email', 'both']),
    paymentPurpose: z.enum(['booking', 'adjustment']),
    adjustmentId: z.string().uuid().optional(),
    force: z.boolean().optional(),
  })
  .refine(
    (v) => v.paymentPurpose !== 'adjustment' || !!v.adjustmentId,
    { message: 'adjustmentId required for adjustment links', path: ['adjustmentId'] },
  );

interface SuccessResponse {
  success: true;
  paymentUrl: string;
  sentSms: boolean;
  sentEmail: boolean;
  smsSkippedReason?: 'missing_credentials' | 'send_failed' | 'no_phone';
  emailSkippedReason?: 'missing_credentials' | 'send_failed' | 'no_email';
  alreadySentRecently?: boolean;
  lastSentAt?: string | null;
  message?: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ bookingId: string }> },
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
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

  if (!parsed.data.force) {
    const recent = await wasRecentlySent({
      bookingId,
      action: 'booking.payment_link.sent',
      withinSeconds: RECENT_WINDOW_SECONDS,
    });
    if (recent.alreadySentRecently) {
      return NextResponse.json(
        {
          success: true,
          paymentUrl: '',
          sentSms: false,
          sentEmail: false,
          alreadySentRecently: true,
          lastSentAt: recent.lastSentAt,
          message:
            recent.message ??
            'A payment link was sent for this booking in the last minute. Pass force=true to send again.',
        },
        { status: 200 },
      );
    }
  }

  const rows = await db
    .select({
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      quoteId: schema.bookings.quoteId,
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl;
  let paymentUrl: string;
  let amountGbp: string | undefined;

  if (parsed.data.paymentPurpose === 'adjustment') {
    const adjId = parsed.data.adjustmentId as string;
    const adjRows = await db
      .select({
        id: schema.bookingAdjustments.id,
        bookingId: schema.bookingAdjustments.bookingId,
        status: schema.bookingAdjustments.status,
        additionalAmountGbp: schema.bookingAdjustments.additionalAmountGbp,
      })
      .from(schema.bookingAdjustments)
      .where(eq(schema.bookingAdjustments.id, adjId))
      .limit(1);
    const adj = adjRows[0];
    if (!adj || adj.bookingId !== bookingId) {
      return NextResponse.json({ error: 'Adjustment not found for booking' }, { status: 404 });
    }
    if (adj.status !== 'pending_payment') {
      return NextResponse.json(
        { error: 'Adjustment is not pending payment', code: 'not_pending' },
        { status: 409 },
      );
    }
    paymentUrl = `${siteUrl}/pay-adjustment/${adj.id}`;
    amountGbp = (Number(adj.additionalAmountGbp) || 0).toFixed(2);
  } else {
    if (!row.quoteId) {
      return NextResponse.json({ error: 'Booking has no quote' }, { status: 400 });
    }
    paymentUrl = `${siteUrl}/checkout?quoteId=${row.quoteId}`;
  }

  let sentSms = false;
  let sentEmail = false;
  let smsSkippedReason: SuccessResponse['smsSkippedReason'];
  let emailSkippedReason: SuccessResponse['emailSkippedReason'];

  if (parsed.data.method === 'sms' || parsed.data.method === 'both') {
    if (!row.customerPhone) {
      smsSkippedReason = 'no_phone';
    } else {
      const r = await sendPaymentLinkSms({ phone: row.customerPhone, link: paymentUrl });
      sentSms = r.sent;
      if (!r.sent && r.skippedReason) smsSkippedReason = r.skippedReason;
    }
  }
  if (parsed.data.method === 'email' || parsed.data.method === 'both') {
    if (!row.customerEmail) {
      emailSkippedReason = 'no_email';
    } else {
      const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY ?? null;
      const whatsappLink = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP ?? null;
      const r = await sendPaymentLinkEmail({
        to: row.customerEmail,
        customerName: row.customerName,
        paymentPurpose: parsed.data.paymentPurpose,
        ...(amountGbp ? { amountGbp } : {}),
        link: paymentUrl,
        ...(businessPhone ? { businessPhone } : {}),
        ...(whatsappLink ? { whatsappLink } : {}),
      });
      sentEmail = r.sent;
      if (!r.sent && r.skippedReason) emailSkippedReason = r.skippedReason;
    }
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'booking.payment_link.sent',
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: {
      method: parsed.data.method,
      paymentPurpose: parsed.data.paymentPurpose,
      sentSms,
      sentEmail,
      ...(amountGbp ? { amountGbp } : {}),
    },
  });

  return NextResponse.json({
    success: true,
    paymentUrl,
    sentSms,
    sentEmail,
    ...(smsSkippedReason ? { smsSkippedReason } : {}),
    ...(emailSkippedReason ? { emailSkippedReason } : {}),
  });
}
