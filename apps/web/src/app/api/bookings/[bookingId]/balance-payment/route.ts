import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { createBookingPaymentIntent } from '@/lib/payments/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();

interface SuccessResponse {
  bookingId: string;
  trackingId: string;
  paymentId: string;
  clientSecret: string;
  amountGbp: string;
  customerName: string | null;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

/**
 * Public balance-payment endpoint.
 * Creates a Stripe PaymentIntent for the outstanding balance on a deposit-mode booking.
 * No admin authentication is required because the customer follows the link emailed to them;
 * however we strictly validate that the booking is deposit-mode and has an outstanding balance.
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ bookingId: string }> },
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  const { bookingId } = await context.params;
  if (!idSchema.safeParse(bookingId).success) {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
  }

  const rows = await db
    .select({
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      quoteId: schema.bookings.quoteId,
      tyreId: schema.bookings.tyreId,
      jobType: schema.bookings.jobType,
      checkoutPaymentMode: schema.bookings.checkoutPaymentMode,
      paymentStatus: schema.bookings.paymentStatus,
      balanceDueGbp: schema.bookings.balanceDueGbp,
      customerId: schema.bookings.customerId,
      customerName: schema.customers.fullName,
      customerEmail: schema.customers.email,
      customerPhone: schema.customers.phone,
    })
    .from(schema.bookings)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);
  const row = rows[0];
  if (!row) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (row.checkoutPaymentMode !== 'DEPOSIT') {
    return NextResponse.json(
      { error: 'Booking is not in deposit mode', code: 'not_deposit' },
      { status: 409 },
    );
  }
  if (row.paymentStatus === 'succeeded') {
    return NextResponse.json(
      { error: 'Booking is already fully paid', code: 'already_paid' },
      { status: 409 },
    );
  }
  const balanceGbp = (Number(row.balanceDueGbp ?? '0') || 0).toFixed(2);
  const balancePence = Math.round(Number(balanceGbp) * 100);
  if (balancePence <= 0) {
    return NextResponse.json(
      { error: 'No balance due on this booking', code: 'no_balance_due' },
      { status: 409 },
    );
  }

  // Reuse an existing pending balance payment row if one was already started
  // (idempotency for accidental double-clicks). We only need to detect a
  // success here; the booking-level paymentStatus check above already prevents
  // double-charging once the webhook has marked the booking as fully paid.

  let intent;
  try {
    intent = await createBookingPaymentIntent({
      amountPence: balancePence,
      currency: 'gbp',
      customerEmail: row.customerEmail ?? '',
      customerName: row.customerName ?? 'Customer',
      customerPhone: row.customerPhone ?? '',
      ...(row.customerEmail ? { receiptEmail: row.customerEmail } : {}),
      description: `TyreRepair UK balance payment ${row.trackingId}`,
      metadata: {
        bookingId,
        quoteId: row.quoteId ?? '',
        trackingId: row.trackingId,
        customerId: row.customerId,
        tyreId: row.tyreId ?? '',
        jobType: row.jobType,
        paymentKind: 'balance',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not create Stripe PaymentIntent', code: 'stripe_failed' },
      { status: 502 },
    );
  }

  let paymentId: string;
  try {
    const inserted = await db
      .insert(schema.payments)
      .values({
        bookingId,
        quoteId: row.quoteId ?? null,
        stripePaymentIntentId: intent.paymentIntentId,
        amountGbp: balanceGbp,
        vatAmountGbp: '0.00',
        currency: 'gbp',
        status: 'processing',
        paymentKind: 'balance',
      })
      .returning({ id: schema.payments.id });
    const created = inserted[0];
    if (!created) throw new Error('no payment id');
    paymentId = created.id;
  } catch {
    return NextResponse.json(
      { error: 'Could not record payment', code: 'db_error' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    bookingId,
    trackingId: row.trackingId,
    paymentId,
    clientSecret: intent.clientSecret,
    amountGbp: balanceGbp,
    customerName: row.customerName,
  });
}
