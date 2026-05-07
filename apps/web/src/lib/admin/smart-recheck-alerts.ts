import 'server-only';

import { db, schema, eq, and, desc, isNull, lt, gte, inArray } from '@tyrerepair/db';

/**
 * Admin Efficiency Pack — Feature 6: Smart Recheck Alerts.
 *
 * On-read aggregation of "you should look at this again" items. No cron.
 * Cheap reads only — runs as part of the action queue assembly.
 */

export type SmartRecheckType =
  | 'PAYMENT_PENDING_TOO_LONG'
  | 'BALANCE_LINK_SENT_NOT_PAID'
  | 'CALLBACK_UNHANDLED'
  | 'GPS_ONLY_UNCONFIRMED'
  | 'LOCKING_NUT_UNCONFIRMED'
  | 'NO_ANSWER_NOT_RETRIED';

export interface SmartRecheckItem {
  id: string;
  type: SmartRecheckType;
  bookingId?: string | null;
  trackingId?: string | null;
  callbackRequestId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  title: string;
  detail: string;
  ageMinutes: number;
  severity: 'WARNING' | 'DANGER';
  createdAt: string;
}

const PAYMENT_PENDING_AFTER_MIN = 10;
const BALANCE_LINK_AFTER_MIN = 20;
const CALLBACK_UNHANDLED_AFTER_MIN = 10;
const NO_ANSWER_RETRY_AFTER_MIN = 15;

function ageMinutes(date: Date): number {
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

export async function getSmartRecheckItems(): Promise<SmartRecheckItem[]> {
  const items: SmartRecheckItem[] = [];
  const now = Date.now();

  /* Payment pending too long */
  try {
    const cutoff = new Date(now - PAYMENT_PENDING_AFTER_MIN * 60000);
    const rows = await db
      .select({
        id: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
        createdAt: schema.bookings.createdAt,
        customerName: schema.customers.fullName,
        customerPhone: schema.customers.phone,
      })
      .from(schema.bookings)
      .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
      .where(
        and(
          eq(schema.bookings.paymentStatus, 'unpaid'),
          inArray(schema.bookings.status, ['pending_payment']),
          lt(schema.bookings.createdAt, cutoff),
        ),
      )
      .orderBy(desc(schema.bookings.createdAt))
      .limit(20);
    for (const r of rows) {
      items.push({
        id: `pp-${r.id}`,
        type: 'PAYMENT_PENDING_TOO_LONG',
        bookingId: r.id,
        trackingId: r.trackingId,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        title: `Payment unpaid — ${r.trackingId}`,
        detail: 'Payment has been pending for more than 10 minutes.',
        ageMinutes: ageMinutes(r.createdAt),
        severity: 'WARNING',
        createdAt: r.createdAt.toISOString(),
      });
    }
  } catch {
    /* swallow — best effort */
  }

  /* Balance link sent but not paid */
  try {
    const cutoff = new Date(now - BALANCE_LINK_AFTER_MIN * 60000);
    const rows = await db
      .select({
        bookingId: schema.auditLogs.bookingId,
        createdAt: schema.auditLogs.createdAt,
      })
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.action, 'payment.link.sent'),
          lt(schema.auditLogs.createdAt, cutoff),
          gte(
            schema.auditLogs.createdAt,
            new Date(now - 24 * 60 * 60000),
          ),
        ),
      )
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(50);
    const seen = new Set<string>();
    for (const r of rows) {
      if (!r.bookingId || seen.has(r.bookingId)) continue;
      seen.add(r.bookingId);
      const bookingRows = await db
        .select({
          id: schema.bookings.id,
          trackingId: schema.bookings.trackingId,
          paymentStatus: schema.bookings.paymentStatus,
          customerName: schema.customers.fullName,
          customerPhone: schema.customers.phone,
        })
        .from(schema.bookings)
        .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
        .where(eq(schema.bookings.id, r.bookingId))
        .limit(1);
      const b = bookingRows[0];
      if (!b) continue;
      if (b.paymentStatus === 'succeeded' || b.paymentStatus === 'refunded') continue;
      items.push({
        id: `bl-${b.id}`,
        type: 'BALANCE_LINK_SENT_NOT_PAID',
        bookingId: b.id,
        trackingId: b.trackingId,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        title: `Balance not paid — ${b.trackingId}`,
        detail: 'A payment link was sent more than 20 minutes ago and is still unpaid.',
        ageMinutes: ageMinutes(r.createdAt),
        severity: 'WARNING',
        createdAt: r.createdAt.toISOString(),
      });
    }
  } catch {
    /* swallow */
  }

  /* Callback unhandled */
  try {
    const cutoff = new Date(now - CALLBACK_UNHANDLED_AFTER_MIN * 60000);
    const rows = await db
      .select({
        id: schema.callbackRequests.id,
        fullName: schema.callbackRequests.fullName,
        phone: schema.callbackRequests.phone,
        createdAt: schema.callbackRequests.createdAt,
      })
      .from(schema.callbackRequests)
      .where(
        and(
          eq(schema.callbackRequests.status, 'new'),
          lt(schema.callbackRequests.createdAt, cutoff),
        ),
      )
      .orderBy(desc(schema.callbackRequests.createdAt))
      .limit(20);
    for (const r of rows) {
      items.push({
        id: `cb-${r.id}`,
        type: 'CALLBACK_UNHANDLED',
        callbackRequestId: r.id,
        customerName: r.fullName,
        customerPhone: r.phone,
        title: 'Callback request waiting',
        detail: 'A new callback request has been waiting for more than 10 minutes.',
        ageMinutes: ageMinutes(r.createdAt),
        severity: 'DANGER',
        createdAt: r.createdAt.toISOString(),
      });
    }
  } catch {
    /* swallow */
  }

  /* GPS-only unconfirmed (active bookings) */
  try {
    const rows = await db
      .select({
        id: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
        createdAt: schema.bookings.createdAt,
        addressLine1: schema.customerLocations.addressLine1,
        latitude: schema.customerLocations.latitude,
        customerName: schema.customers.fullName,
        customerPhone: schema.customers.phone,
        status: schema.bookings.status,
      })
      .from(schema.bookings)
      .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
      .leftJoin(
        schema.customerLocations,
        eq(schema.customerLocations.id, schema.bookings.locationId),
      )
      .where(
        and(
          inArray(schema.bookings.status, ['confirmed', 'dispatched', 'on_site']),
          isNull(schema.customerLocations.addressLine1),
        ),
      )
      .limit(20);
    for (const r of rows) {
      if (r.latitude == null) continue;
      items.push({
        id: `gps-${r.id}`,
        type: 'GPS_ONLY_UNCONFIRMED',
        bookingId: r.id,
        trackingId: r.trackingId,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        title: `GPS pin only — ${r.trackingId}`,
        detail: 'Active booking has a GPS pin but no street address. Confirm with customer.',
        ageMinutes: ageMinutes(r.createdAt),
        severity: 'WARNING',
        createdAt: r.createdAt.toISOString(),
      });
    }
  } catch {
    /* swallow */
  }

  /* Locking nut unconfirmed */
  try {
    const rows = await db
      .select({
        id: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
        createdAt: schema.bookings.createdAt,
        customerName: schema.customers.fullName,
        customerPhone: schema.customers.phone,
      })
      .from(schema.bookings)
      .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
      .where(
        and(
          eq(schema.bookings.lockingWheelNutStatus, 'NO_KEY'),
          inArray(schema.bookings.status, ['pending_payment', 'confirmed']),
        ),
      )
      .limit(20);
    for (const r of rows) {
      items.push({
        id: `lwn-${r.id}`,
        type: 'LOCKING_NUT_UNCONFIRMED',
        bookingId: r.id,
        trackingId: r.trackingId,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        title: `No locking wheel nut key — ${r.trackingId}`,
        detail: 'Customer has no locking wheel nut key — confirm before dispatch.',
        ageMinutes: ageMinutes(r.createdAt),
        severity: 'WARNING',
        createdAt: r.createdAt.toISOString(),
      });
    }
  } catch {
    /* swallow */
  }

  /* No-answer not retried */
  try {
    const cutoff = new Date(now - NO_ANSWER_RETRY_AFTER_MIN * 60000);
    const rows = await db
      .select({
        bookingId: schema.auditLogs.bookingId,
        createdAt: schema.auditLogs.createdAt,
      })
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.action, 'booking.no_answer.marked'),
          lt(schema.auditLogs.createdAt, cutoff),
          gte(schema.auditLogs.createdAt, new Date(now - 12 * 60 * 60000)),
        ),
      )
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(50);
    const seen = new Set<string>();
    for (const r of rows) {
      if (!r.bookingId || seen.has(r.bookingId)) continue;
      seen.add(r.bookingId);
      const bookingRows = await db
        .select({
          id: schema.bookings.id,
          trackingId: schema.bookings.trackingId,
          status: schema.bookings.status,
          customerName: schema.customers.fullName,
          customerPhone: schema.customers.phone,
        })
        .from(schema.bookings)
        .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
        .where(eq(schema.bookings.id, r.bookingId))
        .limit(1);
      const b = bookingRows[0];
      if (!b) continue;
      if (b.status === 'completed' || b.status === 'cancelled') continue;
      items.push({
        id: `na-${b.id}`,
        type: 'NO_ANSWER_NOT_RETRIED',
        bookingId: b.id,
        trackingId: b.trackingId,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        title: `No answer — retry ${b.trackingId}`,
        detail: 'Last call was no-answer over 15 minutes ago. Try again or send SMS.',
        ageMinutes: ageMinutes(r.createdAt),
        severity: 'WARNING',
        createdAt: r.createdAt.toISOString(),
      });
    }
  } catch {
    /* swallow */
  }

  // Sort: DANGER first, then by age desc.
  items.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'DANGER' ? -1 : 1;
    return b.ageMinutes - a.ageMinutes;
  });

  return items;
}
