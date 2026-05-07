import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  triggerRealtimeEvent,
  type BookingCheckoutStartedPayload,
  type RealtimeEvent,
} from '@tyrerepair/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  quoteId: z.string().uuid(),
  jobType: z.enum(['ASSESSMENT', 'REPLACEMENT']),
  tyreProblemType: z
    .enum([
      'PUNCTURE_OR_FLAT',
      'DAMAGED_OR_BLOWN_OUT',
      'SLOW_PRESSURE_LOSS',
      'NEEDS_REPLACEMENT',
      'NOT_SURE',
    ])
    .nullable()
    .optional(),
  totalPriceGbp: z.string().trim().max(16),
  paymentMode: z.enum(['FULL', 'DEPOSIT']),
  page: z.string().trim().max(120).optional(),
});

/**
 * Lightweight transient signal: customer has reached the checkout page and
 * is about to enter their phone/payment details. Not persisted in DB — only
 * published to the admin realtime channel so the operator gets a heads-up
 * banner ("someone is paying right now"). If the customer abandons, no DB
 * row is left behind to clean up.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = (await req.json()) as unknown;
    parsed = bodySchema.parse(json ?? {});
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const startedAt = new Date().toISOString();

  // Best-effort: fetch the quote's original createdAt so the admin can see
  // how long the customer has been deliberating.
  let quoteCreatedAt: string | null = null;
  try {
    const rows = await db
      .select({ createdAt: schema.quotes.createdAt })
      .from(schema.quotes)
      .where(eq(schema.quotes.id, parsed.quoteId))
      .limit(1);
    const first = rows[0];
    if (first?.createdAt) quoteCreatedAt = first.createdAt.toISOString();
  } catch {
    // best effort only
  }

  const payload: BookingCheckoutStartedPayload = {
    quoteId: parsed.quoteId,
    jobType: parsed.jobType,
    tyreProblemType: parsed.tyreProblemType ?? null,
    totalPriceGbp: parsed.totalPriceGbp,
    paymentMode: parsed.paymentMode,
    page: parsed.page ?? '/checkout',
    startedAt,
    quoteCreatedAt,
  };

  const event: RealtimeEvent = {
    type: 'booking.checkout.started',
    payload,
    createdAt: startedAt,
  };

  void triggerRealtimeEvent(ADMIN_CHANNEL, event).catch((e: unknown) => {
    console.error('[booking.checkout.started] realtime publish failed', e);
  });

  return NextResponse.json({ ok: true });
}
