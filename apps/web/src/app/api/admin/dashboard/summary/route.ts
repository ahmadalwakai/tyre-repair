import { NextResponse } from 'next/server';
import { db, schema, sql, eq, and, gte, inArray, desc } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPEN_STATUSES = ['pending_payment', 'confirmed', 'dispatching', 'dispatched', 'on_site'] as const;

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  try {
    const [todayPayments, weekPayments] = await Promise.all([
      db
        .select({
          total: sql<string>`coalesce(sum(${schema.payments.amountGbp}), 0)::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.payments)
        .where(
          and(
            eq(schema.payments.status, 'succeeded'),
            gte(schema.payments.paidAt, todayStart),
          ),
        ),
      db
        .select({
          total: sql<string>`coalesce(sum(${schema.payments.amountGbp}), 0)::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.payments)
        .where(
          and(
            eq(schema.payments.status, 'succeeded'),
            gte(schema.payments.paidAt, weekStart),
          ),
        ),
    ]);

    const [todayBookings, weekBookings, openCount, completedCount, cancelledCount, activeOverridesRow] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.bookings)
          .where(gte(schema.bookings.createdAt, todayStart)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.bookings)
          .where(gte(schema.bookings.createdAt, weekStart)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.bookings)
          .where(inArray(schema.bookings.status, [...OPEN_STATUSES])),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.bookings)
          .where(eq(schema.bookings.status, 'completed')),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.bookings)
          .where(eq(schema.bookings.status, 'cancelled')),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.pricingOverrides)
          .where(eq(schema.pricingOverrides.status, 'active')),
      ]);

    const topTyresRows = await db
      .select({
        tyreId: schema.tyreCatalog.id,
        sku: schema.tyreCatalog.sku,
        brand: schema.tyreCatalog.brand,
        model: schema.tyreCatalog.model,
        sizeLabel: schema.tyreCatalog.sizeLabel,
        tier: schema.tyreCatalog.tier,
        bookings: sql<number>`count(${schema.bookings.id})::int`,
      })
      .from(schema.bookings)
      .innerJoin(schema.tyreCatalog, eq(schema.tyreCatalog.id, schema.bookings.tyreId))
      .where(gte(schema.bookings.createdAt, weekStart))
      .groupBy(
        schema.tyreCatalog.id,
        schema.tyreCatalog.sku,
        schema.tyreCatalog.brand,
        schema.tyreCatalog.model,
        schema.tyreCatalog.sizeLabel,
        schema.tyreCatalog.tier,
      )
      .orderBy(desc(sql`count(${schema.bookings.id})`))
      .limit(5);

    return NextResponse.json({
      today: {
        revenueGbp: Number(todayPayments[0]?.total ?? 0).toFixed(2),
        bookings: todayBookings[0]?.count ?? 0,
        payments: todayPayments[0]?.count ?? 0,
      },
      week: {
        revenueGbp: Number(weekPayments[0]?.total ?? 0).toFixed(2),
        bookings: weekBookings[0]?.count ?? 0,
        payments: weekPayments[0]?.count ?? 0,
      },
      bookings: {
        open: openCount[0]?.count ?? 0,
        completed: completedCount[0]?.count ?? 0,
        cancelled: cancelledCount[0]?.count ?? 0,
      },
      pricing: {
        activeOverrides: activeOverridesRow[0]?.count ?? 0,
      },
      topTyres: topTyresRows.map((t) => ({
        tyreId: t.tyreId,
        sku: t.sku,
        brand: t.brand,
        model: t.model,
        sizeLabel: t.sizeLabel,
        tier: t.tier,
        bookings: t.bookings,
      })),
      generatedAt: now.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Could not generate dashboard' }, { status: 500 });
  }
}
