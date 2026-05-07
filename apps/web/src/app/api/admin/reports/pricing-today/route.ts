/**
 * GET /api/admin/reports/pricing-today — small daily pricing snapshot.
 *
 * Lightweight: no booking-level recompute beyond what `today` already does.
 * Each metric is wrapped in its own try/catch so a single failing aggregate
 * cannot zero the whole report.
 *
 * Caching: in-process per Europe/London date for 60s. `?fresh=1` bypasses
 * the cache but is rate-limited per admin to once every 30s.
 */
import { NextResponse } from 'next/server';
import { db, schema, and, eq, gte, lt, sql, notInArray, inArray } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { dayBoundsLondonUtc, todayLondonDateString } from '@/lib/admin/london-day';
import { evaluateBookingPricingSafety } from '@/lib/pricing/booking-safety';
import { getPricingThresholds } from '@/lib/settings/pricing-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ---------------- Types ---------------- */

export interface PricingTodayReport {
  /** Europe/London ISO date (YYYY-MM-DD) the report covers. */
  date: string;
  /** Bookings created today whose pricing safety is REVIEW/HIGH_RISK/BLOCK. */
  pricingReviewJobsToday: number;
  /** Audit-log count of public quotes blocked at /api/checkout/session. */
  publicCallFirstBlocksToday: number;
  /** Bookings created today flagged with LONG_DISTANCE_ASSESSMENT. */
  longDistanceAssessmentJobsToday: number;
  /** Bookings created today flagged with CASH_ON_SITE_RISK at HIGH_RISK+. */
  cashHighRiskJobsToday: number;
  /** Pricing overrides created today (any kind). */
  overridesAppliedToday: number;
  /** Subset of overridesAppliedToday flagged below recommended minimum. */
  belowMinimumOverridesToday: number;
  /** ISO timestamp this snapshot was generated. */
  generatedAt: string;
}

/* ---------------- Cache + rate limit ---------------- */

interface CacheEntry {
  date: string;
  expiresAt: number;
  payload: PricingTodayReport;
}
let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000;
const FRESH_RATE_LIMIT_MS = 30_000;
const lastFreshByAdmin = new Map<string, number>();

/* ---------------- Handler ---------------- */

export async function GET(req: Request): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const dateStr = todayLondonDateString();
  const url = new URL(req.url);
  const fresh = url.searchParams.get('fresh') === '1';

  if (fresh) {
    const last = lastFreshByAdmin.get(admin.adminId) ?? 0;
    if (Date.now() - last < FRESH_RATE_LIMIT_MS) {
      // Fall through to cached response if available and not expired.
      if (cache && cache.date === dateStr && cache.expiresAt > Date.now()) {
        return NextResponse.json(cache.payload, {
          headers: { 'X-Cache': 'rate-limited-fresh' },
        });
      }
    } else {
      lastFreshByAdmin.set(admin.adminId, Date.now());
    }
  } else if (cache && cache.date === dateStr && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.payload, { headers: { 'X-Cache': 'hit' } });
  }

  const { fromUtc, toUtc } = dayBoundsLondonUtc(dateStr);

  /* ---- Aggregates ---- */

  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  // 1) + 3) + 4) — re-evaluate pricing safety for today's active bookings.
  const safetyCounts = await safe<{
    pricingReviewJobsToday: number;
    longDistanceAssessmentJobsToday: number;
    cashHighRiskJobsToday: number;
  }>(async () => {
    const thresholds = await getPricingThresholds();
    const todaysBookings = await db
      .select({
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

    let pricingReview = 0;
    let longDistance = 0;
    let cashHighRisk = 0;
    for (const b of todaysBookings) {
      const lat = b.latitude !== null ? Number(b.latitude) : null;
      const lng = b.longitude !== null ? Number(b.longitude) : null;
      const hasConfirmedAddress = Boolean(b.addressLine1 && b.postcode);
      const totalGbp = b.totalPriceGbp ? String(b.totalPriceGbp) : '0.00';
      const paymentMode = b.checkoutPaymentMode === 'DEPOSIT' ? 'DEPOSIT' : 'FULL';
      const { safety } = evaluateBookingPricingSafety(
        {
          jobType: b.jobType,
          totalPriceGbp: totalGbp,
          latitude: lat,
          longitude: lng,
          hasConfirmedAddress,
          lockingWheelNutStatus: b.lockingWheelNutStatus,
          paymentMode,
        },
        thresholds,
      );
      if (
        safety.level === 'REVIEW' ||
        safety.level === 'HIGH_RISK' ||
        safety.level === 'BLOCK_PUBLIC_PAYMENT'
      ) {
        pricingReview += 1;
      }
      if (safety.reasons.includes('LONG_DISTANCE_ASSESSMENT')) {
        longDistance += 1;
      }
      if (
        safety.reasons.includes('CASH_ON_SITE_RISK') &&
        (safety.level === 'HIGH_RISK' || safety.level === 'BLOCK_PUBLIC_PAYMENT')
      ) {
        cashHighRisk += 1;
      }
    }
    return {
      pricingReviewJobsToday: pricingReview,
      longDistanceAssessmentJobsToday: longDistance,
      cashHighRiskJobsToday: cashHighRisk,
    };
  }, {
    pricingReviewJobsToday: 0,
    longDistanceAssessmentJobsToday: 0,
    cashHighRiskJobsToday: 0,
  });

  // 2) Public "call first" blocks from audit log.
  const publicCallFirstBlocksToday = await safe(async () => {
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.action, 'pricing.safety.public_payment_blocked'),
          gte(schema.auditLogs.createdAt, fromUtc),
          lt(schema.auditLogs.createdAt, toUtc),
        ),
      );
    return row?.c ?? 0;
  }, 0);

  // 5) Overrides applied today.
  const overridesAppliedToday = await safe(async () => {
    const [row] = await db
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
    return row?.c ?? 0;
  }, 0);

  // 6) Below-minimum overrides today.
  const belowMinimumOverridesToday = await safe(async () => {
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.action, 'pricing.override.below_recommended_minimum'),
          gte(schema.auditLogs.createdAt, fromUtc),
          lt(schema.auditLogs.createdAt, toUtc),
        ),
      );
    return row?.c ?? 0;
  }, 0);

  const payload: PricingTodayReport = {
    date: dateStr,
    pricingReviewJobsToday: safetyCounts.pricingReviewJobsToday,
    publicCallFirstBlocksToday,
    longDistanceAssessmentJobsToday: safetyCounts.longDistanceAssessmentJobsToday,
    cashHighRiskJobsToday: safetyCounts.cashHighRiskJobsToday,
    overridesAppliedToday,
    belowMinimumOverridesToday,
    generatedAt: new Date().toISOString(),
  };

  cache = { date: dateStr, expiresAt: Date.now() + CACHE_TTL_MS, payload };
  return NextResponse.json(payload, {
    headers: { 'X-Cache': fresh ? 'fresh' : 'miss' },
  });
}
