import { NextResponse } from 'next/server';
import { db, schema, eq } from '@tyrerepair/db';
import { getBookingByTrackingId } from '@/lib/bookings/tracking';
import { trackingIdSchema } from '@/lib/validation/checkout';
import {
  getCustomerStatusDescription,
  getCustomerStatusLabel,
} from '@/lib/bookings/status';
import {
  getBookingPaymentSummary,
  formatPaymentSummaryForCustomer,
} from '@/lib/payments/payment-summary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  context: { params: Promise<{ bookingId: string }> },
): Promise<NextResponse> {
  // The public tracking lookup uses the tracking ID as the URL segment.
  // Next.js requires consistent slug names per path level (we already have
  // `[bookingId]/balance-payment`), so the segment is named `bookingId`, but
  // the value is treated as a tracking ID.
  const { bookingId: trackingId } = await context.params;
  const parsed = trackingIdSchema.safeParse(trackingId);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid tracking ID' }, { status: 400 });
  }

  const booking = await getBookingByTrackingId(parsed.data);
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Look up the booking row so we can build a customer-safe payment summary.
  let customerPayment = null;
  try {
    const rows = await db
      .select({ id: schema.bookings.id })
      .from(schema.bookings)
      .where(eq(schema.bookings.trackingId, booking.trackingId))
      .limit(1);
    const bookingId = rows[0]?.id;
    if (bookingId) {
      const summary = await getBookingPaymentSummary(bookingId);
      if (summary) {
        customerPayment = formatPaymentSummaryForCustomer(summary);
      }
    }
  } catch {
    customerPayment = null;
  }

  return NextResponse.json({
    trackingId: booking.trackingId,
    status: booking.status,
    statusLabel: getCustomerStatusLabel(booking.status),
    statusDescription: getCustomerStatusDescription(booking.status),
    paymentStatus: booking.paymentStatus,
    paymentSummary: customerPayment,
    tyre: booking.tyre,
    availability: booking.availability,
    isSpecialOrder: booking.isSpecialOrder,
    location: booking.location,
    totalPriceGbp: booking.totalPriceGbp,
    currency: booking.currency,
    createdAt: booking.createdAt,
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    refundedAt: booking.refundedAt,
    timeline: booking.timeline.map((t) => ({
      toStatus: t.toStatus,
      fromStatus: t.fromStatus,
      label: getCustomerStatusLabel(t.toStatus),
      message: t.message,
      createdAt: t.createdAt,
    })),
  });
}
