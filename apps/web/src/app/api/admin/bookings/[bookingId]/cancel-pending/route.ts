/**
 * One-tap cancel for a `pending_payment` booking that never received money.
 *
 * The full /cancel route requires deposit-decision/refund inputs; this is a
 * shortcut for the action-queue to clear an abandoned booking. Refuses to
 * run unless status === 'pending_payment' AND payment_status is unpaid /
 * processing / failed.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, and } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  trackingChannelFor,
  triggerRealtimeEvent,
  type BookingStatusUpdatedPayload,
  type RealtimeEvent,
} from '@tyrerepair/realtime';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SAFE_TO_CANCEL_PAYMENT = ['unpaid', 'processing', 'failed'] as const;

async function safeTrigger(
  channel: string,
  type: RealtimeEvent['type'],
  payload: RealtimeEvent['payload'],
): Promise<void> {
  try {
    await triggerRealtimeEvent(channel, { type, payload } as RealtimeEvent);
  } catch {
    /* never fail action on realtime */
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ bookingId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { bookingId } = await context.params;
  if (!z.string().uuid().safeParse(bookingId).success) {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
  }

  const rows = await db
    .select({
      id: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      status: schema.bookings.status,
      paymentStatus: schema.bookings.paymentStatus,
    })
    .from(schema.bookings)
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);

  const booking = rows[0];
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.status !== 'pending_payment') {
    return NextResponse.json(
      { error: 'Use the full cancel flow — booking is past pending payment.' },
      { status: 409 },
    );
  }
  if (
    !SAFE_TO_CANCEL_PAYMENT.includes(
      booking.paymentStatus as (typeof SAFE_TO_CANCEL_PAYMENT)[number],
    )
  ) {
    return NextResponse.json(
      { error: 'Payment exists — use the full cancel flow with a refund decision.' },
      { status: 409 },
    );
  }

  const now = new Date();
  await db
    .update(schema.bookings)
    .set({
      status: 'cancelled',
      paymentStatus: 'cancelled',
      updatedAt: now,
    })
    .where(
      and(eq(schema.bookings.id, bookingId), eq(schema.bookings.status, 'pending_payment')),
    );

  try {
    await db.insert(schema.bookingEvents).values({
      bookingId,
      fromStatus: 'pending_payment',
      toStatus: 'cancelled',
      message: 'Cancelled from action queue (abandoned checkout)',
    });
  } catch {
    /* non-fatal */
  }

  const statusPayload: BookingStatusUpdatedPayload = {
    bookingId,
    trackingId: booking.trackingId,
    fromStatus: 'pending_payment',
    toStatus: 'cancelled',
    updatedAt: now.toISOString(),
  };
  await safeTrigger(ADMIN_CHANNEL, 'booking.status.updated', statusPayload);
  await safeTrigger(trackingChannelFor(booking.trackingId), 'booking.status.updated', statusPayload);

  return NextResponse.json({ ok: true, bookingId, trackingId: booking.trackingId });
}
