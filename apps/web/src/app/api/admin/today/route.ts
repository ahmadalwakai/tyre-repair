import { NextResponse } from 'next/server';
import { db, schema, eq, and, gte, lt, sql, notInArray, inArray } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import {
  dayBoundsLondonUtc,
  todayLondonDateString,
  toMoney,
} from '@/lib/admin/london-day';
import { evaluateBookingPricingSafety } from '@/lib/pricing/booking-safety';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/* Item 7 — Today screen                                                      */
/* -------------------------------------------------------------------------- */

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const dateStr = todayLondonDateString();
  const { fromUtc, toUtc } = dayBoundsLondonUtc(dateStr);

  // Bookings created today
  const [bookingsToday] = await db
    .select({
      total: sql<number>`count(*)::int`,
      newCount: sql<number>`count(*) FILTER (WHERE ${schema.bookings.status} = 'pending_payment')::int`,
      confirmed: sql<number>`count(*) FILTER (WHERE ${schema.bookings.status} = 'confirmed')::int`,
      dispatched: sql<number>`count(*) FILTER (WHERE ${schema.bookings.status} = 'dispatched')::int`,
      onSite: sql<number>`count(*) FILTER (WHERE ${schema.bookings.status} = 'on_site')::int`,
      completed: sql<number>`count(*) FILTER (WHERE ${schema.bookings.status} = 'completed')::int`,
      cancelled: sql<number>`count(*) FILTER (WHERE ${schema.bookings.status} = 'cancelled')::int`,
      buyTyres: sql<number>`count(*) FILTER (WHERE ${schema.bookings.source} = 'tyre_shop')::int`,
      emergency: sql<number>`count(*) FILTER (WHERE ${schema.bookings.source} IS NULL OR ${schema.bookings.source} <> 'tyre_shop')::int`,
      buyTyresPaid: sql<number>`count(*) FILTER (WHERE ${schema.bookings.source} = 'tyre_shop' AND ${schema.bookings.paymentStatus} = 'succeeded')::int`,
      buyTyresBackorders: sql<number>`count(*) FILTER (WHERE ${schema.bookings.source} = 'tyre_shop' AND ${schema.bookings.isBackorder} = true)::int`,
    })
    .from(schema.bookings)
    .where(
      and(
        gte(schema.bookings.createdAt, fromUtc),
        lt(schema.bookings.createdAt, toUtc),
      ),
    );

  // Pending action items (any age — these are operational outstanding)
  const [pending] = await db
    .select({
      paymentFailed: sql<number>`count(*) FILTER (WHERE ${schema.bookings.paymentStatus} = 'failed')::int`,
      depositBalanceDue: sql<number>`count(*) FILTER (WHERE ${schema.bookings.paymentStatus} = 'deposit_paid' AND ${schema.bookings.status} NOT IN ('cancelled','refunded','completed'))::int`,
      noLockingNutKey: sql<number>`count(*) FILTER (WHERE ${schema.bookings.lockingWheelNutStatus} = 'NO_KEY' AND ${schema.bookings.status} NOT IN ('cancelled','refunded','completed'))::int`,
    })
    .from(schema.bookings);

  // Cash collected today
  const paymentRows = await db
    .select({
      amountGbp: schema.payments.amountGbp,
      kind: schema.payments.paymentKind,
    })
    .from(schema.payments)
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
    );

  let collectedTotal = 0;
  let collectedDeposits = 0;
  let collectedFull = 0;
  let collectedBalance = 0;
  let collectedAdjustment = 0;
  for (const r of paymentRows) {
    const amt = Number(r.amountGbp) || 0;
    collectedTotal += amt;
    if (r.kind === 'deposit') collectedDeposits += amt;
    else if (r.kind === 'balance') collectedBalance += amt;
    else if (r.kind === 'adjustment') collectedAdjustment += amt;
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

  // Callback requests today
  const [callbacksToday] = await db
    .select({
      total: sql<number>`count(*)::int`,
      newCount: sql<number>`count(*) FILTER (WHERE ${schema.callbackRequests.status} = 'new')::int`,
    })
    .from(schema.callbackRequests)
    .where(
      and(
        gte(schema.callbackRequests.createdAt, fromUtc),
        lt(schema.callbackRequests.createdAt, toUtc),
      ),
    );

  // Open callbacks (any age, status='new')
  const [openCallbacks] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.callbackRequests)
    .where(eq(schema.callbackRequests.status, 'new'));

  // Pending adjustments (waiting for payment)
  const [pendingAdj] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.bookingAdjustments)
    .where(eq(schema.bookingAdjustments.status, 'pending_payment'));

  // Emergency assist events created today
  const [emergencyToday] = await db
    .select({
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) FILTER (WHERE ${schema.emergencyAssistEvents.status} IN ('NEW','ACKNOWLEDGED'))::int`,
    })
    .from(schema.emergencyAssistEvents)
    .where(
      and(
        gte(schema.emergencyAssistEvents.createdAt, fromUtc),
        lt(schema.emergencyAssistEvents.createdAt, toUtc),
      ),
    );

  const { getNextBestAction } = await import('@/lib/admin/next-best-action');
  const nextBestAction = await getNextBestAction().catch(() => null);

  // Pricing safety today — lightweight counts. Re-evaluates safety using stored
  // booking + location data only (no weather / demand fetches), then groups
  // by level and feature flags. Wrapped in try/catch so it can never break the
  // Today screen.
  let pricingSafety = {
    reviewToday: 0,
    highRiskToday: 0,
    callFirstBlocksToday: 0,
    longDistanceAssessmentsToday: 0,
    cashHighRiskToday: 0,
    overridesToday: 0,
    belowMinimumOverridesToday: 0,
  };
  try {
    const { getPricingThresholds } = await import('@/lib/settings/pricing-settings');
    const pricingThresholds = await getPricingThresholds();
    const todaysBookings = await db
      .select({
        bookingId: schema.bookings.id,
        jobType: schema.bookings.jobType,
        lockingWheelNutStatus: schema.bookings.lockingWheelNutStatus,
        checkoutPaymentMode: schema.bookings.checkoutPaymentMode,
        totalPriceGbp: schema.quotes.totalPriceGbp,
        latitude: schema.customerLocations.latitude,
        longitude: schema.customerLocations.longitude,
        addressLine1: schema.customerLocations.addressLine1,
        postcode: schema.customerLocations.postcode,
      })
      .from(schema.bookings)
      .leftJoin(schema.quotes, eq(schema.quotes.id, schema.bookings.quoteId))
      .leftJoin(
        schema.customerLocations,
        eq(schema.customerLocations.id, schema.bookings.locationId),
      )
      .where(
        and(
          gte(schema.bookings.createdAt, fromUtc),
          lt(schema.bookings.createdAt, toUtc),
          notInArray(schema.bookings.status, ['cancelled', 'refunded']),
        ),
      );

    for (const b of todaysBookings) {
      const lat = b.latitude !== null ? Number(b.latitude) : null;
      const lng = b.longitude !== null ? Number(b.longitude) : null;
      const hasConfirmedAddress = Boolean(b.addressLine1 && b.postcode);
      const totalGbp = b.totalPriceGbp ? String(b.totalPriceGbp) : '0.00';
      const paymentMode = b.checkoutPaymentMode === 'DEPOSIT' ? 'DEPOSIT' : 'FULL';
      const { safety } = evaluateBookingPricingSafety({
        jobType: b.jobType,
        totalPriceGbp: totalGbp,
        latitude: lat,
        longitude: lng,
        hasConfirmedAddress,
        lockingWheelNutStatus: b.lockingWheelNutStatus,
        paymentMode,
      }, pricingThresholds);
      if (safety.level === 'REVIEW') pricingSafety.reviewToday += 1;
      if (safety.level === 'HIGH_RISK') pricingSafety.highRiskToday += 1;
      if (safety.level === 'BLOCK_PUBLIC_PAYMENT') {
        pricingSafety.callFirstBlocksToday += 1;
      }
      if (safety.reasons.includes('LONG_DISTANCE_ASSESSMENT')) {
        pricingSafety.longDistanceAssessmentsToday += 1;
      }
      if (safety.reasons.includes('CASH_ON_SITE_RISK')) {
        pricingSafety.cashHighRiskToday += 1;
      }
    }

    // Override audit counts — both "any override created today" and the
    // narrower "below recommended minimum" count.
    const [overridesCreated] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.auditLogs)
      .where(
        and(
          inArray(schema.auditLogs.action, [
            'pricing.override.created',
            'pricing.override.below_recommended_minimum',
          ]),
          gte(schema.auditLogs.createdAt, fromUtc),
          lt(schema.auditLogs.createdAt, toUtc),
        ),
      );
    pricingSafety.overridesToday = overridesCreated?.c ?? 0;

    const [belowMin] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.action, 'pricing.override.below_recommended_minimum'),
          gte(schema.auditLogs.createdAt, fromUtc),
          lt(schema.auditLogs.createdAt, toUtc),
        ),
      );
    pricingSafety.belowMinimumOverridesToday = belowMin?.c ?? 0;
  } catch {
    /* keep zeros — pricing safety counts must never break Today */
  }

  return NextResponse.json({
    date: dateStr,
    bookingsToday: bookingsToday ?? {
      total: 0, newCount: 0, confirmed: 0, dispatched: 0, onSite: 0, completed: 0, cancelled: 0,
      buyTyres: 0, emergency: 0, buyTyresPaid: 0, buyTyresBackorders: 0,
    },
    pending: pending ?? { paymentFailed: 0, depositBalanceDue: 0, noLockingNutKey: 0 },
    cashToday: {
      collectedTotalGbp: toMoney(collectedTotal),
      collectedFullGbp: toMoney(collectedFull),
      collectedDepositsGbp: toMoney(collectedDeposits),
      collectedBalanceGbp: toMoney(collectedBalance),
      collectedAdjustmentGbp: toMoney(collectedAdjustment),
      paymentsCount: paymentRows.length,
      failedPaymentsCount: failedToday?.c ?? 0,
    },
    callbacks: {
      todayTotal: callbacksToday?.total ?? 0,
      todayNew: callbacksToday?.newCount ?? 0,
      openTotal: openCallbacks?.c ?? 0,
    },
    pendingAdjustments: pendingAdj?.c ?? 0,
    emergencyAssist: {
      todayTotal: emergencyToday?.total ?? 0,
      todayOpen: emergencyToday?.open ?? 0,
    },
    pricingSafety,
    nextBestAction,
  });
}
