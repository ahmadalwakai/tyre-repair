import 'server-only';

import { db, schema, eq, and, desc, lt, inArray, notInArray, sql, isNotNull } from '@tyrerepair/db';

/**
 * Admin Efficiency Pack — Feature 18: Next Best Action.
 *
 * Picks the single highest-priority thing for the admin to do right now.
 * Read-only, lightweight queries. Used on the Today screen.
 */

export type NextBestActionType =
  | 'NONE'
  | 'PAYMENT_FAILED'
  | 'MISSING_LOCKING_NUT_KEY'
  | 'NEW_CALLBACK'
  | 'EMERGENCY_ASSIST_WITH_PHONE'
  | 'EMERGENCY_ASSIST_NO_PHONE'
  | 'BALANCE_DUE'
  | 'GPS_ONLY_LOCATION'
  | 'CUSTOMER_NO_ANSWER'
  | 'LOW_STOCK'
  | 'ASSESSMENT_IN_PROGRESS';

export interface NextBestAction {
  type: NextBestActionType;
  title: string;
  detail: string;
  bookingId?: string | null;
  trackingId?: string | null;
  callbackRequestId?: string | null;
  stockId?: string | null;
  emergencyAssistEventId?: string | null;
  phone?: string | null;
  actionTarget?: string | null;
}

export async function getNextBestAction(): Promise<NextBestAction> {
  // 1. Payment failed
  try {
    const rows = await db
      .select({
        id: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
      })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.paymentStatus, 'failed'),
          inArray(schema.bookings.status, ['pending_payment', 'confirmed']),
        ),
      )
      .orderBy(desc(schema.bookings.createdAt))
      .limit(1);
    const r = rows[0];
    if (r) {
      return {
        type: 'PAYMENT_FAILED',
        title: `Payment failed — ${r.trackingId}`,
        detail: 'Recover this booking by sending a fresh payment link.',
        bookingId: r.id,
        trackingId: r.trackingId,
        actionTarget: `/bookings/${r.id}`,
      };
    }
  } catch {
    /* */
  }

  // 2. New callback request
  try {
    const rows = await db
      .select({
        id: schema.callbackRequests.id,
        fullName: schema.callbackRequests.fullName,
        phone: schema.callbackRequests.phone,
      })
      .from(schema.callbackRequests)
      .where(eq(schema.callbackRequests.status, 'new'))
      .orderBy(desc(schema.callbackRequests.createdAt))
      .limit(1);
    const r = rows[0];
    if (r) {
      return {
        type: 'NEW_CALLBACK',
        title: 'New callback request waiting',
        detail: `${r.fullName ?? 'Customer'} is waiting for a callback on ${r.phone}.`,
        callbackRequestId: r.id,
        actionTarget: '/callbacks',
      };
    }
  } catch {
    /* */
  }

  // 2b. Emergency assist with phone (HIGH priority — actionable lead)
  const emergencySince = new Date(Date.now() - 6 * 60 * 60 * 1000);
  try {
    const rows = await db
      .select({
        id: schema.emergencyAssistEvents.id,
        phone: schema.emergencyAssistEvents.customerPhone,
      })
      .from(schema.emergencyAssistEvents)
      .where(
        and(
          notInArray(schema.emergencyAssistEvents.status, [
            'CONVERTED_TO_QUOTE',
            'EXPIRED',
          ]),
          isNotNull(schema.emergencyAssistEvents.customerPhone),
          sql`${schema.emergencyAssistEvents.createdAt} >= ${emergencySince}`,
        ),
      )
      .orderBy(desc(schema.emergencyAssistEvents.createdAt))
      .limit(1);
    const r = rows[0];
    if (r) {
      return {
        type: 'EMERGENCY_ASSIST_WITH_PHONE',
        title: 'Emergency assist — call customer',
        detail: `A customer asked for emergency help. Call ${r.phone ?? 'them'} now.`,
        emergencyAssistEventId: r.id,
        phone: r.phone,
        actionTarget: '/action-queue',
      };
    }
  } catch {
    /* */
  }

  // 3. Missing locking nut key
  try {
    const rows = await db
      .select({
        id: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
      })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.lockingWheelNutStatus, 'NO_KEY'),
          inArray(schema.bookings.status, ['pending_payment', 'confirmed']),
        ),
      )
      .orderBy(desc(schema.bookings.createdAt))
      .limit(1);
    const r = rows[0];
    if (r) {
      return {
        type: 'MISSING_LOCKING_NUT_KEY',
        title: `Confirm locking nut — ${r.trackingId}`,
        detail: 'Customer has no locking wheel nut key — confirm before dispatch.',
        bookingId: r.id,
        trackingId: r.trackingId,
        actionTarget: `/bookings/${r.id}`,
      };
    }
  } catch {
    /* */
  }

  // 4. Balance due (deposit paid, balance unpaid, confirmed)
  try {
    const rows = await db
      .select({
        id: schema.bookings.id,
        trackingId: schema.bookings.trackingId,
      })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.checkoutPaymentMode, 'DEPOSIT'),
          eq(schema.bookings.paymentStatus, 'succeeded'),
          inArray(schema.bookings.status, ['confirmed', 'dispatched']),
        ),
      )
      .orderBy(desc(schema.bookings.createdAt))
      .limit(1);
    const r = rows[0];
    if (r) {
      return {
        type: 'BALANCE_DUE',
        title: `Balance due — ${r.trackingId}`,
        detail: 'Deposit paid. Send the balance link to complete.',
        bookingId: r.id,
        trackingId: r.trackingId,
        actionTarget: `/bookings/${r.id}`,
      };
    }
  } catch {
    /* */
  }

  // 4b. Emergency assist without phone (above LOW_STOCK)
  try {
    const rows = await db
      .select({ id: schema.emergencyAssistEvents.id })
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
      .limit(1);
    const r = rows[0];
    if (r) {
      return {
        type: 'EMERGENCY_ASSIST_NO_PHONE',
        title: 'Emergency assist — monitor quote',
        detail: 'A customer asked for emergency help. No phone yet — watch the quote flow.',
        emergencyAssistEventId: r.id,
        actionTarget: '/action-queue',
      };
    }
  } catch {
    /* */
  }

  // 5. Low stock
  try {
    const rows = await db
      .select({
        id: schema.stock.id,
        quantityAvailable: schema.stock.quantityAvailable,
        threshold: schema.stock.lowStockThreshold,
      })
      .from(schema.stock)
      .where(lt(schema.stock.quantityAvailable, 3))
      .limit(1);
    const r = rows[0];
    if (r && r.quantityAvailable <= r.threshold) {
      return {
        type: 'LOW_STOCK',
        title: 'Low stock alert',
        detail: 'A stocked tyre is at or below its low-stock threshold.',
        stockId: r.id,
        actionTarget: '/stock',
      };
    }
  } catch {
    /* */
  }

  return {
    type: 'NONE',
    title: 'You are all caught up',
    detail: 'No urgent actions right now. Keep an eye on the action queue.',
  };
}
