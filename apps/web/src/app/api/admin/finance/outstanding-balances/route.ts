import { NextResponse } from 'next/server';
import { db, schema, eq, and, desc, sql, notInArray } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Item 19a — Outstanding balances (deposit_paid bookings with balance > 0). */

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
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      status: schema.bookings.status,
      paymentStatus: schema.bookings.paymentStatus,
      jobType: schema.bookings.jobType,
      depositAmountGbp: schema.bookings.depositAmountGbp,
      balanceDueGbp: schema.bookings.balanceDueGbp,
      depositPaidAt: schema.bookings.depositPaidAt,
      createdAt: schema.bookings.createdAt,
      updatedAt: schema.bookings.updatedAt,
      customerName: schema.customers.fullName,
      customerPhone: schema.customers.phone,
      customerEmail: schema.customers.email,
    })
    .from(schema.bookings)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .where(
      and(
        eq(schema.bookings.paymentStatus, 'deposit_paid'),
        notInArray(schema.bookings.status, ['cancelled', 'refunded', 'completed']),
        sql`COALESCE(${schema.bookings.balanceDueGbp}::numeric, 0) > 0`,
      ),
    )
    .orderBy(desc(schema.bookings.depositPaidAt))
    .limit(500);

  let totalOutstanding = 0;
  const items = rows.map((r) => {
    const balance = Number(r.balanceDueGbp ?? '0') || 0;
    totalOutstanding += balance;
    return {
      bookingId: r.bookingId,
      trackingId: r.trackingId,
      status: r.status,
      paymentStatus: r.paymentStatus,
      jobType: r.jobType,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      customerEmail: r.customerEmail,
      depositAmountGbp: money(r.depositAmountGbp),
      balanceDueGbp: money(r.balanceDueGbp),
      depositPaidAt: r.depositPaidAt ? r.depositPaidAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return NextResponse.json({
    items,
    totals: {
      count: items.length,
      totalOutstandingGbp: money(String(totalOutstanding)),
    },
  });
}
