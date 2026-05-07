import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { createBookingPaymentIntent } from '@/lib/payments/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();

interface SuccessResponse {
  success: true;
  clientSecret: string;
  amountGbp: string;
  trackingId: string;
  customerName: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ adjustmentId: string }> },
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  const { adjustmentId } = await context.params;
  if (!idSchema.safeParse(adjustmentId).success) {
    return NextResponse.json({ error: 'Invalid adjustmentId' }, { status: 400 });
  }

  const rows = await db
    .select({
      id: schema.bookingAdjustments.id,
      bookingId: schema.bookingAdjustments.bookingId,
      type: schema.bookingAdjustments.type,
      status: schema.bookingAdjustments.status,
      additionalAmountGbp: schema.bookingAdjustments.additionalAmountGbp,
      tyreId: schema.bookingAdjustments.tyreId,
      stripePaymentIntentId: schema.bookingAdjustments.stripePaymentIntentId,
      trackingId: schema.bookings.trackingId,
      quoteId: schema.bookings.quoteId,
      customerName: schema.customers.fullName,
      customerEmail: schema.customers.email,
      customerPhone: schema.customers.phone,
      customerId: schema.customers.id,
    })
    .from(schema.bookingAdjustments)
    .leftJoin(schema.bookings, eq(schema.bookings.id, schema.bookingAdjustments.bookingId))
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .where(eq(schema.bookingAdjustments.id, adjustmentId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: 'Adjustment not found', code: 'not_found' }, { status: 404 });
  }
  if (row.status !== 'pending_payment') {
    return NextResponse.json(
      { error: 'This payment link is no longer active', code: 'not_pending' },
      { status: 409 },
    );
  }
  if (!row.bookingId || !row.trackingId || !row.customerId) {
    return NextResponse.json(
      { error: 'Adjustment is missing booking context', code: 'missing_booking' },
      { status: 500 },
    );
  }

  // Reuse existing PaymentIntent if already created and still valid
  if (row.stripePaymentIntentId) {
    const existing = await db
      .select({
        id: schema.payments.id,
        amountGbp: schema.payments.amountGbp,
        stripePaymentIntentId: schema.payments.stripePaymentIntentId,
        status: schema.payments.status,
      })
      .from(schema.payments)
      .where(eq(schema.payments.stripePaymentIntentId, row.stripePaymentIntentId))
      .limit(1);
    const ex = existing[0];
    if (ex && (ex.status === 'processing' || ex.status === 'requires_payment_method')) {
      // Need to fetch the live client_secret from Stripe to display Element
      // We cannot retrieve clientSecret without a Stripe API call so just create a fresh intent below
    }
  }

  const amountPence = Math.round(Number(row.additionalAmountGbp) * 100);
  if (!Number.isFinite(amountPence) || amountPence <= 0) {
    return NextResponse.json(
      { error: 'Invalid adjustment amount', code: 'invalid_amount' },
      { status: 500 },
    );
  }

  let intent;
  try {
    intent = await createBookingPaymentIntent({
      amountPence,
      currency: 'gbp',
      customerEmail: row.customerEmail ?? '',
      customerName: row.customerName ?? 'Customer',
      customerPhone: row.customerPhone ?? '',
      ...(row.customerEmail ? { receiptEmail: row.customerEmail } : {}),
      description: `TyreRepair UK replacement payment ${row.trackingId}`,
      metadata: {
        bookingId: row.bookingId,
        quoteId: row.quoteId ?? '',
        trackingId: row.trackingId,
        customerId: row.customerId,
        tyreId: row.tyreId ?? '',
        bookingAdjustmentId: row.id,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not create Stripe payment intent', code: 'stripe_failed' },
      { status: 502 },
    );
  }

  // Persist a payment row tied to the adjustment via stripePaymentIntentId
  try {
    await db
      .insert(schema.payments)
      .values({
        bookingId: row.bookingId,
        quoteId: row.quoteId ?? null,
        stripePaymentIntentId: intent.paymentIntentId,
        amountGbp: (intent.amountPence / 100).toFixed(2),
        vatAmountGbp: '0.00',
        currency: 'gbp',
        status: 'processing',
      })
      .onConflictDoNothing();
  } catch {
    // ignore — the payment record is a convenience; the intent + adjustment
    // metadata is the source of truth for the webhook
  }

  // Link the intent ID back to the adjustment
  try {
    await db
      .update(schema.bookingAdjustments)
      .set({ stripePaymentIntentId: intent.paymentIntentId, updatedAt: new Date() })
      .where(eq(schema.bookingAdjustments.id, row.id));
  } catch {
    // ignore
  }

  return NextResponse.json({
    success: true,
    clientSecret: intent.clientSecret,
    amountGbp: (intent.amountPence / 100).toFixed(2),
    trackingId: row.trackingId,
    customerName: row.customerName ?? 'Customer',
  });
}
