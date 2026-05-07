import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, and, gte, lt, sql, desc } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import {
  dayBoundsLondonUtc,
  todayLondonDateString,
  toMoney,
} from '@/lib/admin/london-day';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Item 19c — Daily Close summary (read-only; complements cash-reconciliation). */

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Use YYYY-MM-DD')
    .optional(),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    date: url.searchParams.get('date') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }
  const dateStr = parsed.data.date ?? todayLondonDateString();
  const { fromUtc, toUtc } = dayBoundsLondonUtc(dateStr);

  // Successful payments today
  const succeeded = await db
    .select({
      id: schema.payments.id,
      bookingId: schema.payments.bookingId,
      kind: schema.payments.paymentKind,
      amountGbp: schema.payments.amountGbp,
      paidAt: schema.payments.paidAt,
      createdAt: schema.payments.createdAt,
      trackingId: schema.bookings.trackingId,
      customerName: schema.customers.fullName,
    })
    .from(schema.payments)
    .leftJoin(schema.bookings, eq(schema.bookings.id, schema.payments.bookingId))
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .where(
      and(
        eq(schema.payments.status, 'succeeded'),
        gte(
          sql`COALESCE(${schema.payments.paidAt}, ${schema.payments.createdAt})`,
          fromUtc,
        ),
        lt(
          sql`COALESCE(${schema.payments.paidAt}, ${schema.payments.createdAt})`,
          toUtc,
        ),
      ),
    )
    .orderBy(desc(schema.payments.paidAt));

  let collectedTotal = 0;
  let collectedFull = 0;
  let collectedDeposit = 0;
  let collectedBalance = 0;
  let collectedAdjustment = 0;
  for (const p of succeeded) {
    const amt = Number(p.amountGbp) || 0;
    collectedTotal += amt;
    if (p.kind === 'deposit') collectedDeposit += amt;
    else if (p.kind === 'balance') collectedBalance += amt;
    else if (p.kind === 'adjustment') collectedAdjustment += amt;
    else collectedFull += amt;
  }

  // Failed payments today
  const [failedToday] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.status, 'failed'),
        gte(schema.payments.createdAt, fromUtc),
        lt(schema.payments.createdAt, toUtc),
      ),
    );

  // Bookings completed today
  const [completedToday] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.status, 'completed'),
        gte(schema.bookings.completedAt, fromUtc),
        lt(schema.bookings.completedAt, toUtc),
      ),
    );

  // Cancelled today
  const [cancelledToday] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.status, 'cancelled'),
        gte(schema.bookings.cancelledAt, fromUtc),
        lt(schema.bookings.cancelledAt, toUtc),
      ),
    );

  // Cancellations with deposits retained today
  const [retainedRow] = await db
    .select({
      retainedTotal: sql<string>`COALESCE(SUM(${schema.bookingCancellations.retainedAmountGbp}::numeric), 0)::text`,
      retainedCount: sql<number>`count(*)::int`,
    })
    .from(schema.bookingCancellations)
    .where(
      and(
        eq(schema.bookingCancellations.depositDecision, 'retain'),
        gte(schema.bookingCancellations.createdAt, fromUtc),
        lt(schema.bookingCancellations.createdAt, toUtc),
      ),
    );

  return NextResponse.json({
    date: dateStr,
    cash: {
      collectedTotalGbp: toMoney(collectedTotal),
      collectedFullGbp: toMoney(collectedFull),
      collectedDepositGbp: toMoney(collectedDeposit),
      collectedBalanceGbp: toMoney(collectedBalance),
      collectedAdjustmentGbp: toMoney(collectedAdjustment),
      paymentsCount: succeeded.length,
      failedCount: failedToday?.c ?? 0,
    },
    operations: {
      completedToday: completedToday?.c ?? 0,
      cancelledToday: cancelledToday?.c ?? 0,
      depositRetainedTotalGbp: toMoney(Number(retainedRow?.retainedTotal ?? 0)),
      depositRetainedCount: retainedRow?.retainedCount ?? 0,
    },
    payments: succeeded.map((p) => ({
      id: p.id,
      bookingId: p.bookingId,
      trackingId: p.trackingId,
      customerName: p.customerName,
      kind: p.kind,
      amountGbp: toMoney(Number(p.amountGbp) || 0),
      paidAt: (p.paidAt ?? p.createdAt).toISOString(),
    })),
  });
}
