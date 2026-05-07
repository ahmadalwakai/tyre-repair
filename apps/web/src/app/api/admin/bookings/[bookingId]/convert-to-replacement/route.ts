import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import {
  ADMIN_CHANNEL,
  trackingChannelFor,
  triggerRealtimeEvent,
  type BookingAdjustmentCreatedPayload,
  type RealtimeEvent,
} from '@tyrerepair/realtime';
import { safeSendAdminNotification } from '@/lib/notifications/send-admin-notification';
import { siteConfig } from '@/lib/site-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();

const bodySchema = z.object({
  tyreId: z.string().uuid(),
  notes: z.string().trim().max(2000).optional(),
});

interface SuccessResponse {
  success: true;
  adjustment: {
    id: string;
    additionalAmountGbp: string;
    totalReplacementAmountGbp: string;
    originalPaidAmountGbp: string;
    paymentLinkUrl: string;
  };
}

interface ErrorResponse {
  error: string;
  code?: string;
}

function toFixed2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function readDistanceFee(pricingBreakdown: unknown): number {
  if (!pricingBreakdown || typeof pricingBreakdown !== 'object') return 0;
  const fee = (pricingBreakdown as { distanceFeeGbp?: unknown }).distanceFeeGbp;
  if (typeof fee === 'string') return Number(fee) || 0;
  if (typeof fee === 'number' && Number.isFinite(fee)) return fee;
  return 0;
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

  // Load booking + customer + quote pricing breakdown + paid amount
  const rows = await db
    .select({
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      jobType: schema.bookings.jobType,
      bookingStatus: schema.bookings.status,
      customerName: schema.customers.fullName,
      customerEmail: schema.customers.email,
      customerPhone: schema.customers.phone,
      customerId: schema.customers.id,
      quoteId: schema.quotes.id,
      pricingBreakdown: schema.quotes.pricingBreakdown,
      totalPriceGbp: schema.quotes.totalPriceGbp,
      paymentAmount: schema.payments.amountGbp,
      paymentStatus: schema.payments.status,
    })
    .from(schema.bookings)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .leftJoin(schema.quotes, eq(schema.quotes.id, schema.bookings.quoteId))
    .leftJoin(schema.payments, eq(schema.payments.bookingId, schema.bookings.id))
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (row.jobType !== 'ASSESSMENT') {
    return NextResponse.json(
      { error: 'Only assessment bookings can be converted', code: 'invalid_job_type' },
      { status: 400 },
    );
  }
  const eligibleStatuses = new Set(['confirmed', 'dispatching', 'dispatched', 'on_site']);
  if (!eligibleStatuses.has(row.bookingStatus)) {
    return NextResponse.json(
      { error: 'Booking is not in a state that can be converted', code: 'invalid_status' },
      { status: 400 },
    );
  }

  // Load chosen tyre
  const tyreRows = await db
    .select({
      id: schema.tyreCatalog.id,
      brand: schema.tyreCatalog.brand,
      model: schema.tyreCatalog.model,
      sizeLabel: schema.tyreCatalog.sizeLabel,
      basePriceGbp: schema.tyreCatalog.basePriceGbp,
      isActive: schema.tyreCatalog.isActive,
    })
    .from(schema.tyreCatalog)
    .where(eq(schema.tyreCatalog.id, parsed.data.tyreId))
    .limit(1);
  const tyre = tyreRows[0];
  if (!tyre || !tyre.isActive) {
    return NextResponse.json({ error: 'Tyre not found or inactive' }, { status: 404 });
  }

  const distanceFee = readDistanceFee(row.pricingBreakdown);
  const tyrePrice = Number(tyre.basePriceGbp) || 0;
  const replacementTotal = tyrePrice + distanceFee;
  const originalPaid = row.paymentStatus === 'succeeded' ? Number(row.paymentAmount) || 0 : 0;
  const additional = Math.max(0, replacementTotal - originalPaid);

  if (additional <= 0) {
    return NextResponse.json(
      {
        error:
          'No additional payment is required for this replacement. Update the booking manually.',
        code: 'no_additional_due',
      },
      { status: 400 },
    );
  }

  // Insert booking adjustment first (so we have an id for Stripe metadata)
  let adjustmentRow: { id: string } | undefined;
  try {
    const inserted = await db
      .insert(schema.bookingAdjustments)
      .values({
        bookingId,
        type: 'ASSESSMENT_TO_REPLACEMENT',
        status: 'pending_payment',
        originalPaidAmountGbp: toFixed2(originalPaid),
        additionalAmountGbp: toFixed2(additional),
        totalReplacementAmountGbp: toFixed2(replacementTotal),
        tyreId: tyre.id,
        notes: parsed.data.notes ?? null,
        createdByAdminId: admin.adminId,
      })
      .returning({ id: schema.bookingAdjustments.id });
    adjustmentRow = inserted[0];
  } catch {
    return NextResponse.json({ error: 'Could not create adjustment' }, { status: 500 });
  }
  if (!adjustmentRow) {
    return NextResponse.json({ error: 'Could not create adjustment' }, { status: 500 });
  }

  // Build payment link URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl;
  const paymentLinkUrl = `${siteUrl}/pay-adjustment/${adjustmentRow.id}`;

  try {
    await db
      .update(schema.bookingAdjustments)
      .set({ paymentLinkUrl, updatedAt: new Date() })
      .where(eq(schema.bookingAdjustments.id, adjustmentRow.id));
  } catch {
    // non-fatal
  }

  // Realtime + push
  const payload: BookingAdjustmentCreatedPayload = {
    bookingId,
    trackingId: row.trackingId,
    adjustmentId: adjustmentRow.id,
    additionalAmountGbp: toFixed2(additional),
    tyreId: tyre.id,
    createdAt: new Date().toISOString(),
  };
  const event: RealtimeEvent = {
    type: 'booking.adjustment.created',
    payload,
    createdAt: new Date().toISOString(),
  };
  try {
    await triggerRealtimeEvent(ADMIN_CHANNEL, event);
    await triggerRealtimeEvent(trackingChannelFor(row.trackingId), event);
  } catch {
    // never fail on realtime
  }
  await safeSendAdminNotification(event);

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'booking.assessment.converted',
    entityType: 'booking_adjustment',
    entityId: adjustmentRow.id,
    bookingId,
    adjustmentId: adjustmentRow.id,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: {
      tyreId: tyre.id,
      additionalAmountGbp: toFixed2(additional),
      totalReplacementAmountGbp: toFixed2(replacementTotal),
      originalPaidAmountGbp: toFixed2(originalPaid),
    },
  });

  return NextResponse.json(
    {
      success: true,
      adjustment: {
        id: adjustmentRow.id,
        additionalAmountGbp: toFixed2(additional),
        totalReplacementAmountGbp: toFixed2(replacementTotal),
        originalPaidAmountGbp: toFixed2(originalPaid),
        paymentLinkUrl,
      },
    },
    { status: 201 },
  );
}
