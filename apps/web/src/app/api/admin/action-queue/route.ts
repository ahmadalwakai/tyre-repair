import { NextResponse } from 'next/server';
import {
  db,
  schema,
  eq,
  and,
  sql,
  desc,
  isNull,
  notInArray,
  lte,
  gte,
} from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { getSmartRecheckItems } from '@/lib/admin/smart-recheck-alerts';
import { evaluateBookingPricingSafety } from '@/lib/pricing/booking-safety';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/* Item 3 — Action Queue                                                      */
/*                                                                            */
/* Aggregates everything that needs admin attention into a single ranked      */
/* feed: failed payments, deposits awaiting balance, callback requests, low   */
/* stock, pending adjustments, NO_KEY locking nut bookings, and unread        */
/* high-priority notifications.                                               */
/* -------------------------------------------------------------------------- */

type Severity = 'DANGER' | 'WARNING' | 'INFO';

interface ActionItem {
  id: string;
  kind:
    | 'payment_failed'
    | 'deposit_balance_due'
    | 'callback_request'
    | 'pending_adjustment'
    | 'low_stock'
    | 'locking_nut_no_key'
    | 'high_priority_notification'
    | 'smart_recheck'
    | 'emergency_assist_started'
    | 'website_call_clicked'
    | 'booking_in_progress'
    | 'booking_abandoned'
    | 'pricing_review_required';
  severity: Severity;
  title: string;
  message: string;
  bookingId: string | null;
  trackingId: string | null;
  callbackRequestId: string | null;
  stockId: string | null;
  notificationId: string | null;
  amountGbp: string | null;
  source?: string | null;
  smartRecheckType?: string | null;
  emergencyAssistEventId?: string | null;
  callClickEventId?: string | null;
  sourcePage?: string | null;
  sourceComponent?: string | null;
  customerName?: string | null;
  tyreProblemType?: string | null;
  jobType?: string | null;
  phone?: string | null;
  vehicleRegistration?: string | null;
  recommendedAction?:
    | 'CALL_CUSTOMER'
    | 'MONITOR_QUOTE'
    | 'OPEN_QUICK_BOOKING'
    | null;
  pricingRiskLevel?:
    | 'NORMAL'
    | 'REVIEW'
    | 'HIGH_RISK'
    | 'BLOCK_PUBLIC_PAYMENT'
    | null;
  pricingReasons?: string[] | null;
  pricingRecommendedAction?:
    | 'CONTINUE'
    | 'TAKE_DEPOSIT'
    | 'REQUIRE_FULL_PAYMENT'
    | 'CALL_FIRST'
    | 'ADMIN_REVIEW'
    | 'SWITCH_TO_REPLACEMENT'
    | 'CREATE_AS_ASSESSMENT_FIRST'
    | null;
  pricingRecommendedPaymentMode?:
    | 'CASH'
    | 'DEPOSIT'
    | 'FULL'
    | 'MANUAL_REVIEW'
    | null;
  pricingDistanceMiles?: number | null;
  quoteId?: string | null;
  createdAt: string;
}

function money(v: string | null | undefined): string | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return (Math.round(n * 100) / 100).toFixed(2);
}

const ACTIVE_BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'dispatching',
  'dispatched',
  'on_site',
] as const;

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const items: ActionItem[] = [];

  // 1) Failed payments (active bookings only)
  const failedPayments = await db
    .select({
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      balanceDueGbp: schema.bookings.balanceDueGbp,
      updatedAt: schema.bookings.updatedAt,
      customerName: schema.customers.fullName,
    })
    .from(schema.bookings)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .where(
      and(
        eq(schema.bookings.paymentStatus, 'failed'),
        notInArray(schema.bookings.status, ['cancelled', 'refunded', 'completed']),
      ),
    )
    .orderBy(desc(schema.bookings.updatedAt))
    .limit(100);

  for (const b of failedPayments) {
    items.push({
      id: `payment_failed:${b.bookingId}`,
      kind: 'payment_failed',
      severity: 'DANGER',
      title: `Payment failed — ${b.trackingId}`,
      message: `Payment failed for ${b.customerName ?? 'customer'}. Contact customer or send a new payment link.`,
      bookingId: b.bookingId,
      trackingId: b.trackingId,
      callbackRequestId: null,
      stockId: null,
      notificationId: null,
      amountGbp: money(b.balanceDueGbp),
      createdAt: b.updatedAt.toISOString(),
    });
  }

  // 2) Deposit paid but balance still due
  const depositOutstanding = await db
    .select({
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      balanceDueGbp: schema.bookings.balanceDueGbp,
      depositPaidAt: schema.bookings.depositPaidAt,
      customerName: schema.customers.fullName,
    })
    .from(schema.bookings)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .where(
      and(
        eq(schema.bookings.paymentStatus, 'deposit_paid'),
        notInArray(schema.bookings.status, ['cancelled', 'refunded', 'completed']),
      ),
    )
    .orderBy(desc(schema.bookings.updatedAt))
    .limit(100);

  for (const b of depositOutstanding) {
    items.push({
      id: `deposit_balance_due:${b.bookingId}`,
      kind: 'deposit_balance_due',
      severity: 'WARNING',
      title: `Balance due — ${b.trackingId}`,
      message: `Deposit paid for ${b.customerName ?? 'customer'}. Send the balance payment link before completion.`,
      bookingId: b.bookingId,
      trackingId: b.trackingId,
      callbackRequestId: null,
      stockId: null,
      notificationId: null,
      amountGbp: money(b.balanceDueGbp),
      createdAt: (b.depositPaidAt ?? new Date()).toISOString(),
    });
  }

  // 2b) Bookings in progress / abandoned (status='pending_payment').
  // Customer started checkout but never completed payment.
  // Recent (<5 min)   = INFO  → "booking_in_progress" (likely still completing)
  // 5–30 min          = WARN  → "booking_in_progress" (call to recover)
  // 30 min – 24h      = DANGER → "booking_abandoned" (escalate)
  const inProgressWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pendingPaymentBookings = await db
    .select({
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      totalPriceGbp: schema.quotes.totalPriceGbp,
      createdAt: schema.bookings.createdAt,
      customerName: schema.customers.fullName,
      customerPhone: schema.customers.phone,
      vehicleRegistration: schema.quotes.vehicleRegistration,
      jobType: schema.bookings.jobType,
      tyreProblemType: schema.bookings.tyreProblemType,
    })
    .from(schema.bookings)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .leftJoin(schema.quotes, eq(schema.quotes.id, schema.bookings.quoteId))
    .where(
      and(
        eq(schema.bookings.status, 'pending_payment'),
        gte(schema.bookings.createdAt, inProgressWindowStart),
      ),
    )
    .orderBy(desc(schema.bookings.createdAt))
    .limit(50);

  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  for (const b of pendingPaymentBookings) {
    const ageMs = Date.now() - b.createdAt.getTime();
    const isAbandoned = b.createdAt.getTime() < thirtyMinAgo;
    const isWarming = !isAbandoned && b.createdAt.getTime() < fiveMinAgo;
    const minutesAgo = Math.max(1, Math.round(ageMs / 60_000));
    const baseMsg = `${b.customerName ?? 'Customer'} started checkout ${minutesAgo}m ago and has not paid yet.`;
    const recoveryMsg = b.customerPhone
      ? `${baseMsg} Call ${b.customerPhone} to help them complete.`
      : `${baseMsg} No phone captured — monitor or release stock.`;
    items.push({
      id: `${isAbandoned ? 'booking_abandoned' : 'booking_in_progress'}:${b.bookingId}`,
      kind: isAbandoned ? 'booking_abandoned' : 'booking_in_progress',
      severity: isAbandoned ? 'DANGER' : isWarming ? 'WARNING' : 'INFO',
      title: isAbandoned
        ? `Abandoned booking — ${b.trackingId}`
        : `Customer in checkout — ${b.trackingId}`,
      message: isAbandoned
        ? `${b.customerName ?? 'Customer'} did not complete payment after ${minutesAgo}m. Recover or cancel to free stock.`
        : recoveryMsg,
      bookingId: b.bookingId,
      trackingId: b.trackingId,
      callbackRequestId: null,
      stockId: null,
      notificationId: null,
      amountGbp: money(b.totalPriceGbp),
      phone: b.customerPhone ?? null,
      customerName: b.customerName ?? null,
      vehicleRegistration: b.vehicleRegistration ?? null,
      jobType: b.jobType ?? null,
      tyreProblemType: b.tyreProblemType ?? null,
      recommendedAction: b.customerPhone ? 'CALL_CUSTOMER' : 'MONITOR_QUOTE',
      createdAt: b.createdAt.toISOString(),
    });
  }

  // 3) Callback requests waiting
  const callbacks = await db
    .select({
      id: schema.callbackRequests.id,
      fullName: schema.callbackRequests.fullName,
      phone: schema.callbackRequests.phone,
      createdAt: schema.callbackRequests.createdAt,
    })
    .from(schema.callbackRequests)
    .where(eq(schema.callbackRequests.status, 'new'))
    .orderBy(desc(schema.callbackRequests.createdAt))
    .limit(100);

  for (const c of callbacks) {
    items.push({
      id: `callback:${c.id}`,
      kind: 'callback_request',
      severity: 'WARNING',
      title: `Callback — ${c.fullName ?? c.phone}`,
      message: `Customer requested a callback. Phone: ${c.phone}.`,
      bookingId: null,
      trackingId: null,
      callbackRequestId: c.id,
      stockId: null,
      notificationId: null,
      amountGbp: null,
      createdAt: c.createdAt.toISOString(),
    });
  }

  // 4) Pending adjustments awaiting payment
  const adjustments = await db
    .select({
      id: schema.bookingAdjustments.id,
      bookingId: schema.bookingAdjustments.bookingId,
      additionalAmountGbp: schema.bookingAdjustments.additionalAmountGbp,
      createdAt: schema.bookingAdjustments.createdAt,
      trackingId: schema.bookings.trackingId,
    })
    .from(schema.bookingAdjustments)
    .leftJoin(schema.bookings, eq(schema.bookings.id, schema.bookingAdjustments.bookingId))
    .where(eq(schema.bookingAdjustments.status, 'pending_payment'))
    .orderBy(desc(schema.bookingAdjustments.createdAt))
    .limit(100);

  for (const a of adjustments) {
    items.push({
      id: `adjustment:${a.id}`,
      kind: 'pending_adjustment',
      severity: 'WARNING',
      title: `Adjustment payment due — ${a.trackingId ?? 'booking'}`,
      message: 'Replacement adjustment is awaiting payment from the customer.',
      bookingId: a.bookingId,
      trackingId: a.trackingId,
      callbackRequestId: null,
      stockId: null,
      notificationId: null,
      amountGbp: money(a.additionalAmountGbp),
      createdAt: a.createdAt.toISOString(),
    });
  }

  // 5) Low stock
  const lowStock = await db
    .select({
      id: schema.stock.id,
      tyreId: schema.stock.tyreId,
      quantityAvailable: schema.stock.quantityAvailable,
      lowStockThreshold: schema.stock.lowStockThreshold,
      updatedAt: schema.stock.updatedAt,
      brand: schema.tyreCatalog.brand,
      sizeLabel: schema.tyreCatalog.sizeLabel,
    })
    .from(schema.stock)
    .leftJoin(schema.tyreCatalog, eq(schema.tyreCatalog.id, schema.stock.tyreId))
    .where(lte(schema.stock.quantityAvailable, schema.stock.lowStockThreshold))
    .orderBy(schema.stock.quantityAvailable)
    .limit(50);

  for (const s of lowStock) {
    const label = `${s.brand ?? 'Tyre'} ${s.sizeLabel ?? ''}`.trim();
    items.push({
      id: `low_stock:${s.id}`,
      kind: 'low_stock',
      severity: s.quantityAvailable === 0 ? 'DANGER' : 'INFO',
      title:
        s.quantityAvailable === 0
          ? `Out of stock — ${label}`
          : `Low stock — ${label}`,
      message: `Available: ${s.quantityAvailable} (threshold ${s.lowStockThreshold}).`,
      bookingId: null,
      trackingId: null,
      callbackRequestId: null,
      stockId: s.id,
      notificationId: null,
      amountGbp: null,
      createdAt: s.updatedAt.toISOString(),
    });
  }

  // 6) NO_KEY locking nut on active bookings
  const noKey = await db
    .select({
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      updatedAt: schema.bookings.updatedAt,
      customerName: schema.customers.fullName,
    })
    .from(schema.bookings)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .where(
      and(
        eq(schema.bookings.lockingWheelNutStatus, 'NO_KEY'),
        notInArray(schema.bookings.status, ['cancelled', 'refunded', 'completed']),
      ),
    )
    .orderBy(desc(schema.bookings.updatedAt))
    .limit(50);

  for (const b of noKey) {
    items.push({
      id: `locking_nut:${b.bookingId}`,
      kind: 'locking_nut_no_key',
      severity: 'WARNING',
      title: `Locking nut key missing — ${b.trackingId}`,
      message: `${b.customerName ?? 'Customer'} has no locking wheel nut key. Confirm before dispatch.`,
      bookingId: b.bookingId,
      trackingId: b.trackingId,
      callbackRequestId: null,
      stockId: null,
      notificationId: null,
      amountGbp: null,
      createdAt: b.updatedAt.toISOString(),
    });
  }

  // 7) High-priority unread notifications
  const highPri = await db
    .select({
      id: schema.adminNotifications.id,
      title: schema.adminNotifications.title,
      body: schema.adminNotifications.body,
      bookingId: schema.adminNotifications.bookingId,
      trackingId: schema.adminNotifications.trackingId,
      stockId: schema.adminNotifications.stockId,
      callbackRequestId: schema.adminNotifications.callbackRequestId,
      createdAt: schema.adminNotifications.createdAt,
    })
    .from(schema.adminNotifications)
    .where(
      and(
        eq(schema.adminNotifications.priority, 'high'),
        isNull(schema.adminNotifications.handledAt),
      ),
    )
    .orderBy(desc(schema.adminNotifications.createdAt))
    .limit(50);

  for (const n of highPri) {
    items.push({
      id: `notification:${n.id}`,
      kind: 'high_priority_notification',
      severity: 'DANGER',
      title: n.title,
      message: n.body,
      bookingId: n.bookingId,
      trackingId: n.trackingId,
      callbackRequestId: n.callbackRequestId,
      stockId: n.stockId,
      notificationId: n.id,
      amountGbp: null,
      createdAt: n.createdAt.toISOString(),
    });
  }

  // 7b) Active emergency assist events (NEW or ACKNOWLEDGED, last 24h)
  const emergencySince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const emergencies = await db
    .select({
      id: schema.emergencyAssistEvents.id,
      status: schema.emergencyAssistEvents.status,
      vehicleRegistration: schema.emergencyAssistEvents.vehicleRegistration,
      customerPhone: schema.emergencyAssistEvents.customerPhone,
      locationLabel: schema.emergencyAssistEvents.locationLabel,
      createdAt: schema.emergencyAssistEvents.createdAt,
    })
    .from(schema.emergencyAssistEvents)
    .where(
      and(
        notInArray(schema.emergencyAssistEvents.status, [
          'CONVERTED_TO_QUOTE',
          'EXPIRED',
        ]),
        sql`${schema.emergencyAssistEvents.createdAt} >= ${emergencySince}`,
      ),
    )
    .orderBy(desc(schema.emergencyAssistEvents.createdAt))
    .limit(50);

  for (const e of emergencies) {
    const phone = e.customerPhone ?? null;
    const reg = e.vehicleRegistration ?? null;
    const message = phone
      ? `A customer clicked 'I need help now'. Phone: ${phone}.${reg ? ` Vehicle: ${reg}.` : ''}`
      : `A customer clicked 'I need help now' on the quote page.${reg ? ` Vehicle: ${reg}.` : ''}`;
    items.push({
      id: `emergency_assist:${e.id}`,
      kind: 'emergency_assist_started',
      severity: 'DANGER',
      title: 'Emergency assist started',
      message,
      bookingId: null,
      trackingId: null,
      callbackRequestId: null,
      stockId: null,
      notificationId: null,
      amountGbp: null,
      emergencyAssistEventId: e.id,
      phone,
      vehicleRegistration: reg,
      recommendedAction: phone ? 'CALL_CUSTOMER' : 'MONITOR_QUOTE',
      createdAt: e.createdAt.toISOString(),
    });
  }

  // 8) Smart recheck items (Admin Efficiency Pack F6)
  try {
    const recheck = await getSmartRecheckItems();
    for (const r of recheck) {
      items.push({
        id: `recheck:${r.id}`,
        kind: 'smart_recheck',
        severity: r.severity,
        title: r.title,
        message: r.detail,
        bookingId: r.bookingId ?? null,
        trackingId: r.trackingId ?? null,
        callbackRequestId: r.callbackRequestId ?? null,
        stockId: null,
        notificationId: null,
        amountGbp: null,
        source: null,
        smartRecheckType: r.type,
        createdAt: r.createdAt,
      });
    }
  } catch {
    /* swallow */
  }

  // 9) Recent unhandled website call-clicks (Call Now Admin Recovery Pack).
  //    HIGH severity (DANGER) within the first 5 minutes; older but still
  //    unhandled drops to MEDIUM (WARNING). Capped to last 30 minutes so the
  //    queue does not fill with stale signals.
  const callClickWindowStart = new Date(Date.now() - 30 * 60_000);
  const callClickHotCutoff = new Date(Date.now() - 5 * 60_000);
  const recentCallClicks = await db
    .select({
      id: schema.callClickEvents.id,
      sourcePage: schema.callClickEvents.sourcePage,
      sourceComponent: schema.callClickEvents.sourceComponent,
      phone: schema.callClickEvents.phone,
      customerName: schema.callClickEvents.customerName,
      tyreProblemType: schema.callClickEvents.tyreProblemType,
      jobType: schema.callClickEvents.jobType,
      bookingId: schema.callClickEvents.bookingId,
      createdAt: schema.callClickEvents.createdAt,
    })
    .from(schema.callClickEvents)
    .where(
      and(
        isNull(schema.callClickEvents.handledAt),
        gte(schema.callClickEvents.createdAt, callClickWindowStart),
      ),
    )
    .orderBy(desc(schema.callClickEvents.createdAt))
    .limit(25);

  for (const c of recentCallClicks) {
    const isHot = c.createdAt >= callClickHotCutoff;
    const sourceLabel = c.sourceComponent ?? 'the website';
    const pageLabel = c.sourcePage ?? '/';
    const message = `A visitor tapped Call Now from ${sourceLabel} on ${pageLabel}.`;
    items.push({
      id: `call_click:${c.id}`,
      kind: 'website_call_clicked',
      severity: isHot ? 'DANGER' : 'WARNING',
      title: 'Website call button clicked',
      message,
      bookingId: c.bookingId,
      trackingId: null,
      callbackRequestId: null,
      stockId: null,
      notificationId: null,
      amountGbp: null,
      callClickEventId: c.id,
      sourcePage: c.sourcePage,
      sourceComponent: c.sourceComponent,
      customerName: c.customerName,
      tyreProblemType: c.tyreProblemType,
      jobType: c.jobType,
      phone: c.phone,
      recommendedAction: c.phone ? 'CALL_CUSTOMER' : 'OPEN_QUICK_BOOKING',
      createdAt: c.createdAt.toISOString(),
    });
  }

  // 10) Pricing safety review — recompute lightweight pricing-safety verdict
  // for active bookings using stored data only (no weather / demand fetches).
  // Only HIGH_RISK / BLOCK_PUBLIC_PAYMENT / REVIEW levels surface here.
  // Dedupe id includes the level so a booking that escalates does not collide
  // with its previous review entry.
  try {
    const { getPricingThresholds } = await import('@/lib/settings/pricing-settings');
    const pricingThresholds = await getPricingThresholds();
    const activeBookings = await db
      .select({
        bookingId: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
        quoteId: schema.bookings.quoteId,
        jobType: schema.bookings.jobType,
        lockingWheelNutStatus: schema.bookings.lockingWheelNutStatus,
        checkoutPaymentMode: schema.bookings.checkoutPaymentMode,
        totalPriceGbp: schema.quotes.totalPriceGbp,
        latitude: schema.customerLocations.latitude,
        longitude: schema.customerLocations.longitude,
        addressLine1: schema.customerLocations.addressLine1,
        postcode: schema.customerLocations.postcode,
        customerName: schema.customers.fullName,
        createdAt: schema.bookings.createdAt,
      })
      .from(schema.bookings)
      .leftJoin(schema.quotes, eq(schema.quotes.id, schema.bookings.quoteId))
      .leftJoin(
        schema.customerLocations,
        eq(schema.customerLocations.id, schema.bookings.locationId),
      )
      .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
      .where(notInArray(schema.bookings.status, ['cancelled', 'refunded', 'completed']))
      .orderBy(desc(schema.bookings.createdAt))
      .limit(150);

    for (const b of activeBookings) {
      const lat = b.latitude !== null ? Number(b.latitude) : null;
      const lng = b.longitude !== null ? Number(b.longitude) : null;
      const hasConfirmedAddress = Boolean(b.addressLine1 && b.postcode);
      const totalGbp = b.totalPriceGbp ? String(b.totalPriceGbp) : '0.00';
      const paymentMode = b.checkoutPaymentMode === 'DEPOSIT' ? 'DEPOSIT' : 'FULL';
      const { safety, distanceMiles } = evaluateBookingPricingSafety({
        jobType: b.jobType,
        totalPriceGbp: totalGbp,
        latitude: lat,
        longitude: lng,
        hasConfirmedAddress,
        lockingWheelNutStatus: b.lockingWheelNutStatus,
        paymentMode,
      }, pricingThresholds);

      // NORMAL is hidden. The locking-nut item already covers NO_KEY blocks,
      // so when the only reason is LOCKING_NUT_NO_KEY we skip to avoid
      // duplicating with the existing 'locking_nut_no_key' kind.
      if (safety.level === 'NORMAL') continue;
      if (
        safety.reasons.length === 1 &&
        safety.reasons[0] === 'LOCKING_NUT_NO_KEY'
      ) {
        continue;
      }

      const severity: Severity =
        safety.level === 'HIGH_RISK' || safety.level === 'BLOCK_PUBLIC_PAYMENT'
          ? 'DANGER'
          : 'WARNING';
      const headlineReason = safety.adminReasons[0] ?? safety.message;

      items.push({
        id: `pricing_review:${b.bookingId}:${safety.level}`,
        kind: 'pricing_review_required',
        severity,
        title: `Pricing review required — ${b.trackingId}`,
        message: headlineReason,
        bookingId: b.bookingId,
        trackingId: b.trackingId,
        callbackRequestId: null,
        stockId: null,
        notificationId: null,
        amountGbp: money(totalGbp),
        customerName: b.customerName ?? null,
        jobType: b.jobType,
        pricingRiskLevel: safety.level,
        pricingReasons: safety.adminReasons,
        pricingRecommendedAction: safety.recommendedAction,
        pricingRecommendedPaymentMode: safety.recommendedPaymentMode,
        pricingDistanceMiles: distanceMiles,
        quoteId: b.quoteId,
        createdAt: b.createdAt.toISOString(),
      });
    }
  } catch {
    /* swallow — pricing review must never break the action queue */
  }

  // Rank: DANGER first, then WARNING, then INFO; within each, newest first.
  const severityRank: Record<Severity, number> = { DANGER: 0, WARNING: 1, INFO: 2 };
  items.sort((a, b) => {
    const s = severityRank[a.severity] - severityRank[b.severity];
    if (s !== 0) return s;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const counts = {
    total: items.length,
    danger: items.filter((i) => i.severity === 'DANGER').length,
    warning: items.filter((i) => i.severity === 'WARNING').length,
    info: items.filter((i) => i.severity === 'INFO').length,
  };

  // Avoid unused-import warning for sql
  void sql;
  void ACTIVE_BOOKING_STATUSES;

  return NextResponse.json({ items, counts });
}
