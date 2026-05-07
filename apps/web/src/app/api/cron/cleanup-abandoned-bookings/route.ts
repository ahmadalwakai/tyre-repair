import { NextResponse } from 'next/server';
import { db, schema, eq, and, lte } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  trackingChannelFor,
  triggerRealtimeEvent,
  type BookingStatusUpdatedPayload,
  type RealtimeEvent,
} from '@tyrerepair/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/* Cron: cleanup abandoned pending_payment bookings                           */
/*                                                                            */
/* Marks bookings that have been stuck in 'pending_payment' for longer than   */
/* CLEANUP_AFTER_MINUTES (default 60) as 'cancelled'. This frees stock        */
/* reservations and clears stale items from the action queue.                 */
/*                                                                            */
/* Auth: requires header `x-cron-secret: ${CRON_SECRET}` OR Vercel's          */
/* `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sends this).           */
/* -------------------------------------------------------------------------- */

const DEFAULT_CLEANUP_MINUTES = 60;
const SYSTEM_REASON = 'Customer abandoned checkout (auto-cleanup)';

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const headerSecret = req.headers.get('x-cron-secret');
  if (headerSecret && headerSecret === secret) return true;
  const auth = req.headers.get('authorization');
  if (auth && auth === `Bearer ${secret}`) return true;
  return false;
}

async function safeTrigger(
  channel: string,
  type: RealtimeEvent['type'],
  payload: RealtimeEvent['payload'],
): Promise<void> {
  try {
    await triggerRealtimeEvent(channel, { type, payload } as RealtimeEvent);
  } catch {
    /* never fail cron on realtime */
  }
}

async function runCleanup(req: Request): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const minutesParam = url.searchParams.get('minutes');
  const minutes = minutesParam ? Number(minutesParam) : DEFAULT_CLEANUP_MINUTES;
  const cutoff = new Date(
    Date.now() - (Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_CLEANUP_MINUTES) *
      60_000,
  );

  // Snapshot the candidates first so we can broadcast realtime events.
  const candidates = await db
    .select({
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      paymentStatus: schema.bookings.paymentStatus,
    })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.status, 'pending_payment'),
        lte(schema.bookings.createdAt, cutoff),
      ),
    )
    .limit(100);

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, cancelled: 0, cutoff: cutoff.toISOString() });
  }

  const now = new Date();
  let cancelled = 0;

  for (const b of candidates) {
    try {
      await db
        .update(schema.bookings)
        .set({
          status: 'cancelled',
          ...(b.paymentStatus === 'unpaid' || b.paymentStatus === 'processing'
            ? { paymentStatus: 'cancelled' as const }
            : {}),
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.bookings.id, b.bookingId),
            eq(schema.bookings.status, 'pending_payment'),
          ),
        );

      try {
        await db.insert(schema.bookingEvents).values({
          bookingId: b.bookingId,
          fromStatus: 'pending_payment',
          toStatus: 'cancelled',
          message: SYSTEM_REASON,
        });
      } catch {
        /* non-fatal */
      }

      const statusPayload: BookingStatusUpdatedPayload = {
        bookingId: b.bookingId,
        trackingId: b.trackingId,
        fromStatus: 'pending_payment',
        toStatus: 'cancelled',
        updatedAt: now.toISOString(),
      };
      await safeTrigger(ADMIN_CHANNEL, 'booking.status.updated', statusPayload);
      await safeTrigger(
        trackingChannelFor(b.trackingId),
        'booking.status.updated',
        statusPayload,
      );

      cancelled += 1;
    } catch {
      /* skip and continue */
    }
  }

  return NextResponse.json({
    ok: true,
    cancelled,
    inspected: candidates.length,
    cutoff: cutoff.toISOString(),
  });
}

export async function GET(req: Request): Promise<NextResponse> {
  return runCleanup(req);
}

export async function POST(req: Request): Promise<NextResponse> {
  return runCleanup(req);
}
