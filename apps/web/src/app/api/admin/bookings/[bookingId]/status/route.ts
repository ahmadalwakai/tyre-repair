import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, sql } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  trackingChannelFor,
  triggerRealtimeEvent,
  type BookingStatus,
  type BookingStatusUpdatedPayload,
} from '@tyrerepair/realtime';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { safeSendAdminNotification } from '@/lib/notifications/send-admin-notification';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_VALUES: readonly BookingStatus[] = [
  'pending_payment',
  'confirmed',
  'dispatching',
  'dispatched',
  'on_site',
  'completed',
  'cancelled',
  'refunded',
  'failed',
] as const;

const ALLOWED_TRANSITIONS: Record<BookingStatus, ReadonlyArray<BookingStatus>> = {
  pending_payment: ['confirmed', 'cancelled', 'failed'],
  confirmed: ['dispatching', 'cancelled', 'refunded'],
  dispatching: ['dispatched', 'cancelled'],
  dispatched: ['on_site', 'cancelled'],
  on_site: ['completed', 'cancelled'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
  failed: [],
};

const patchSchema = z.object({
  toStatus: z.enum(STATUS_VALUES as unknown as [BookingStatus, ...BookingStatus[]]),
  message: z.string().trim().max(2000).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ bookingId: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { bookingId } = await context.params;
  if (!z.string().uuid().safeParse(bookingId).success) {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status update', issues: parsed.error.issues }, { status: 400 });
  }

  let booking;
  try {
    const rows = await db
      .select({
        id: schema.bookings.id,
        status: schema.bookings.status,
        paymentStatus: schema.bookings.paymentStatus,
        trackingId: schema.bookings.trackingId,
      })
      .from(schema.bookings)
      .where(eq(schema.bookings.id, bookingId))
      .limit(1);
    booking = rows[0];
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const fromStatus = booking.status as BookingStatus;
  const toStatus = parsed.data.toStatus;
  if (fromStatus === toStatus) {
    return NextResponse.json({ success: true, status: toStatus, unchanged: true });
  }
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed.includes(toStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${fromStatus} to ${toStatus}` },
      { status: 400 },
    );
  }

  const now = new Date();
  const updates: Record<string, unknown> = { status: toStatus, updatedAt: now };
  if (toStatus === 'dispatched') updates['dispatchedAt'] = now;
  if (toStatus === 'on_site') updates['onSiteAt'] = now;
  if (toStatus === 'completed') updates['completedAt'] = now;
  if (toStatus === 'cancelled') {
    updates['cancelledAt'] = now;
    if (booking.paymentStatus === 'unpaid' || booking.paymentStatus === 'processing') {
      updates['paymentStatus'] = 'cancelled';
    }
  }
  if (toStatus === 'refunded') {
    updates['refundedAt'] = now;
    updates['paymentStatus'] = 'refunded';
  }

  try {
    await db.update(schema.bookings).set(updates).where(eq(schema.bookings.id, bookingId));
  } catch {
    return NextResponse.json({ error: 'Could not update booking' }, { status: 500 });
  }

  try {
    await db.insert(schema.bookingEvents).values({
      bookingId,
      fromStatus,
      toStatus,
      message: parsed.data.message ?? `Admin status change: ${fromStatus} → ${toStatus}`,
      createdByAdminId: admin.adminId,
      metadata: sql`'{}'::jsonb`,
    });
  } catch {
    // non-fatal
  }

  const payload: BookingStatusUpdatedPayload = {
    bookingId,
    trackingId: booking.trackingId,
    fromStatus,
    toStatus,
    updatedAt: now.toISOString(),
  };
  const event = {
    type: 'booking.status.updated' as const,
    payload,
    createdAt: now.toISOString(),
  };
  try {
    await Promise.all([
      triggerRealtimeEvent(ADMIN_CHANNEL, event),
      triggerRealtimeEvent(trackingChannelFor(booking.trackingId), event),
    ]);
  } catch {
    // pusher unconfigured
  }
  await safeSendAdminNotification(event);

  await writeAuditLogSafe({
    actorType: 'admin',
    action: toStatus === 'completed'
      ? 'booking.completed'
      : toStatus === 'cancelled'
        ? 'booking.cancelled'
        : 'booking.status.changed',
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    before: { status: fromStatus },
    after: { status: toStatus },
    metadata: { trackingId: booking.trackingId, message: parsed.data.message ?? null },
  });

  return NextResponse.json({ success: true, status: toStatus });
}
