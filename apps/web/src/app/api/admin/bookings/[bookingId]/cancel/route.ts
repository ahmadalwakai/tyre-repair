import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, and, sql } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  trackingChannelFor,
  triggerRealtimeEvent,
  type BookingStatus,
  type BookingStatusUpdatedPayload,
} from '@tyrerepair/realtime';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe, type AuditAction } from '@/lib/audit/audit-log';
import { safeSendAdminNotification } from '@/lib/notifications/send-admin-notification';
import { sendBookingCancellationEmail } from '@/lib/email/booking-cancellation';
import { siteConfig } from '@/lib/site-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STAGE_VALUES = [
  'before_dispatch',
  'after_dispatch',
  'on_site',
  'after_work_started',
  'customer_no_show',
  'cannot_complete',
] as const;

const DECISION_VALUES = [
  'not_applicable',
  'refund_deposit',
  'retain_deposit',
  'partial_refund',
  'balance_due',
  'manual_review',
] as const;

const TERMINAL_STATUSES: ReadonlyArray<BookingStatus> = [
  'cancelled',
  'refunded',
  'failed',
  'completed',
];

const moneyString = z
  .string()
  .regex(/^\d{1,8}(\.\d{1,2})?$/u, 'Use up to 2 decimals');

const bodySchema = z.object({
  stage: z.enum(STAGE_VALUES),
  reason: z.string().trim().min(2).max(160),
  depositDecision: z.enum(DECISION_VALUES),
  retainedAmountGbp: moneyString.optional(),
  refundDueGbp: moneyString.optional(),
  balanceDueGbp: moneyString.optional(),
  customerMessage: z.string().trim().max(2000).optional(),
  internalNotes: z.string().trim().max(4000).optional(),
});

interface SucceededDepositRow {
  amountGbp: string;
}

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
  if (!z.string().uuid().safeParse(bookingId).success) {
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
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  let booking;
  try {
    const rows = await db
      .select({
        id: schema.bookings.id,
        status: schema.bookings.status,
        paymentStatus: schema.bookings.paymentStatus,
        trackingId: schema.bookings.trackingId,
        depositAmountGbp: schema.bookings.depositAmountGbp,
        balanceDueGbp: schema.bookings.balanceDueGbp,
        depositPaidAt: schema.bookings.depositPaidAt,
        customerId: schema.bookings.customerId,
      })
      .from(schema.bookings)
      .where(eq(schema.bookings.id, bookingId))
      .limit(1);
    booking = rows[0];
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const fromStatus = booking.status as BookingStatus;
  if (TERMINAL_STATUSES.includes(fromStatus)) {
    return NextResponse.json(
      { error: `Booking is already ${fromStatus}` },
      { status: 409 },
    );
  }

  // Has the customer paid any deposit / balance via Stripe (succeeded only)?
  let succeededTotal = 0;
  try {
    const paid = await db
      .select({ amountGbp: schema.payments.amountGbp })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.bookingId, bookingId),
          eq(schema.payments.status, 'succeeded'),
        ),
      );
    for (const row of paid as SucceededDepositRow[]) {
      const n = Number(row.amountGbp);
      if (Number.isFinite(n) && n > 0) succeededTotal += n;
    }
  } catch {
    // non-fatal
  }

  const depositPaid = succeededTotal > 0 || !!booking.depositPaidAt;
  if (depositPaid && input.depositDecision === 'not_applicable') {
    return NextResponse.json(
      {
        error:
          'A deposit or payment has been received — choose a deposit decision (retain / partial refund / refund review / balance due / manual review).',
      },
      { status: 400 },
    );
  }

  // Customer info for email
  let customer;
  try {
    const rows = await db
      .select({
        fullName: schema.customers.fullName,
        email: schema.customers.email,
      })
      .from(schema.customers)
      .where(eq(schema.customers.id, booking.customerId))
      .limit(1);
    customer = rows[0];
  } catch {
    customer = undefined;
  }

  const now = new Date();

  const updates: Record<string, unknown> = {
    status: 'cancelled' as BookingStatus,
    cancelledAt: now,
    updatedAt: now,
  };
  if (booking.paymentStatus === 'unpaid' || booking.paymentStatus === 'processing') {
    updates['paymentStatus'] = 'cancelled';
  }

  try {
    await db.update(schema.bookings).set(updates).where(eq(schema.bookings.id, bookingId));
  } catch {
    return NextResponse.json({ error: 'Could not cancel booking' }, { status: 500 });
  }

  // Insert cancellation record
  let cancellationId: string | null = null;
  try {
    const inserted = await db
      .insert(schema.bookingCancellations)
      .values({
        bookingId,
        cancelledByAdminId: admin.adminId,
        reason: input.reason,
        stage: input.stage,
        depositDecision: input.depositDecision,
        depositAmountGbp: booking.depositAmountGbp ?? null,
        retainedAmountGbp: input.retainedAmountGbp ?? null,
        refundDueGbp: input.refundDueGbp ?? null,
        balanceDueGbp: input.balanceDueGbp ?? booking.balanceDueGbp ?? null,
        customerMessage: input.customerMessage ?? null,
        internalNotes: input.internalNotes ?? null,
      })
      .returning({ id: schema.bookingCancellations.id });
    cancellationId = inserted[0]?.id ?? null;
  } catch {
    // non-fatal — cancellation record is for audit, booking already cancelled
  }

  // Booking event
  try {
    await db.insert(schema.bookingEvents).values({
      bookingId,
      fromStatus,
      toStatus: 'cancelled',
      message: `Cancelled (${input.stage}): ${input.reason}`,
      createdByAdminId: admin.adminId,
      metadata: sql`'{}'::jsonb`,
    });
  } catch {
    // non-fatal
  }

  // Realtime — admin + tracking
  const statusPayload: BookingStatusUpdatedPayload = {
    bookingId,
    trackingId: booking.trackingId,
    fromStatus,
    toStatus: 'cancelled',
    updatedAt: now.toISOString(),
  };
  const statusEvent = {
    type: 'booking.status.updated' as const,
    payload: statusPayload,
    createdAt: now.toISOString(),
  };
  try {
    await Promise.all([
      triggerRealtimeEvent(ADMIN_CHANNEL, statusEvent),
      triggerRealtimeEvent(trackingChannelFor(booking.trackingId), statusEvent),
    ]);
  } catch {
    // pusher unconfigured
  }
  await safeSendAdminNotification(statusEvent);

  // Audit logs — main + decision-specific
  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'cancellation.created',
    entityType: 'cancellation',
    entityId: cancellationId ?? bookingId,
    bookingId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    before: { status: fromStatus, paymentStatus: booking.paymentStatus },
    after: {
      status: 'cancelled',
      stage: input.stage,
      depositDecision: input.depositDecision,
    },
    metadata: {
      trackingId: booking.trackingId,
      reason: input.reason,
      retainedAmountGbp: input.retainedAmountGbp ?? null,
      refundDueGbp: input.refundDueGbp ?? null,
      balanceDueGbp: input.balanceDueGbp ?? null,
      depositPaid,
      depositAmountGbp: booking.depositAmountGbp ?? null,
    },
  });

  const decisionAction: AuditAction | null =
    input.depositDecision === 'retain_deposit'
      ? 'cancellation.deposit.retained'
      : input.depositDecision === 'refund_deposit' ||
          input.depositDecision === 'partial_refund' ||
          input.depositDecision === 'manual_review'
        ? 'cancellation.refund.review_required'
        : null;

  if (decisionAction) {
    await writeAuditLogSafe({
      actorType: 'admin',
      action: decisionAction,
      entityType: 'cancellation',
      entityId: cancellationId ?? bookingId,
      bookingId,
      actorAdminId: admin.adminId,
      actorLabel: admin.email,
      metadata: {
        trackingId: booking.trackingId,
        depositAmountGbp: booking.depositAmountGbp ?? null,
        retainedAmountGbp: input.retainedAmountGbp ?? null,
        refundDueGbp: input.refundDueGbp ?? null,
      },
    });
  }

  // Customer email — best-effort, only if email on file
  let emailSent = false;
  let emailSkippedReason: string | undefined;
  if (customer?.email) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl;
    const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY ?? undefined;
    const whatsappLink = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP ?? undefined;
    try {
      const result = await sendBookingCancellationEmail({
        to: customer.email,
        customerName: customer.fullName ?? 'Customer',
        trackingId: booking.trackingId,
        reason: input.reason,
        stage: input.stage,
        depositDecision: input.depositDecision,
        depositAmountGbp: booking.depositAmountGbp ?? null,
        retainedAmountGbp: input.retainedAmountGbp ?? null,
        refundDueGbp: input.refundDueGbp ?? null,
        ...(input.customerMessage ? { customerMessage: input.customerMessage } : {}),
        cancellationPolicyUrl: `${siteUrl}/cancellation-policy`,
        ...(businessPhone ? { businessPhone } : {}),
        ...(whatsappLink ? { whatsappLink } : {}),
      });
      emailSent = result.sent;
      if (!result.sent) emailSkippedReason = result.skippedReason;
    } catch {
      emailSkippedReason = 'send_failed';
    }
  } else {
    emailSkippedReason = 'no_email_on_file';
  }

  return NextResponse.json({
    success: true,
    bookingId,
    cancellationId,
    status: 'cancelled' as BookingStatus,
    depositDecision: input.depositDecision,
    emailSent,
    ...(emailSkippedReason ? { emailSkippedReason } : {}),
  });
}
