import { NextResponse } from 'next/server';
import { db, schema, eq, desc } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Item 19b — Failed payments list. */

function money(v: string | null | undefined): string {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  return (Math.round(n * 100) / 100).toFixed(2);
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const rows = await db
    .select({
      paymentId: schema.payments.id,
      bookingId: schema.payments.bookingId,
      kind: schema.payments.paymentKind,
      amountGbp: schema.payments.amountGbp,
      failedAt: schema.payments.failedAt,
      createdAt: schema.payments.createdAt,
      stripePaymentIntentId: schema.payments.stripePaymentIntentId,
      trackingId: schema.bookings.trackingId,
      bookingStatus: schema.bookings.status,
      bookingPaymentStatus: schema.bookings.paymentStatus,
      customerName: schema.customers.fullName,
      customerPhone: schema.customers.phone,
      customerEmail: schema.customers.email,
    })
    .from(schema.payments)
    .leftJoin(schema.bookings, eq(schema.bookings.id, schema.payments.bookingId))
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .where(eq(schema.payments.status, 'failed'))
    .orderBy(desc(schema.payments.createdAt))
    .limit(200);

  const items = rows.map((r) => ({
    paymentId: r.paymentId,
    bookingId: r.bookingId,
    trackingId: r.trackingId,
    kind: r.kind,
    amountGbp: money(r.amountGbp),
    failedAt: r.failedAt ? r.failedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    stripePaymentIntentId: r.stripePaymentIntentId,
    bookingStatus: r.bookingStatus,
    bookingPaymentStatus: r.bookingPaymentStatus,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    customerEmail: r.customerEmail,
  }));

  return NextResponse.json({ items, totals: { count: items.length } });
}
