/**
 * Action queue: pricing review service.
 *
 * Idempotent upsert + Pusher notify for HIGH_RISK / BLOCK_PUBLIC_PAYMENT
 * bookings created via the admin Quick Booking flow. Used so the admin app
 * sees exactly one PRICING_REVIEW_REQUIRED card per booking even when the
 * same booking is re-saved.
 */
import { db, schema, and, eq, sql } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  triggerRealtimeEvent,
  type AdminActionQueuePricingReviewUpsertedPayload,
} from '@tyrerepair/realtime';
import type {
  ActionQueueItemType,
  ActionQueueSuggestedPayment,
} from './types';

export interface CreatePricingReviewInput {
  bookingId: string;
  safetyLevel: 'HIGH_RISK' | 'BLOCK_PUBLIC_PAYMENT';
  /** Reason codes from PricingSafetyResult.reasons. */
  reasons: string[];
  suggestedPayment: ActionQueueSuggestedPayment | null;
  recommendedNextSteps: string[];
}

const PRICING_REVIEW_TYPE: ActionQueueItemType = 'PRICING_REVIEW_REQUIRED';

function dedupeKey(bookingId: string): string {
  return `pricing_review:${bookingId}`;
}

function buildTitle(input: CreatePricingReviewInput): string {
  return input.safetyLevel === 'BLOCK_PUBLIC_PAYMENT'
    ? 'Pricing review required (blocked online payment)'
    : 'Pricing review required (high risk)';
}

/**
 * Upsert the OPEN pricing-review action item for a booking.
 *
 * - If an OPEN item already exists for this booking, update its reasons,
 *   suggested payment and recommended next steps in place. No duplicate is
 *   created.
 * - If none exists, insert a new OPEN row.
 *
 * Always publishes the realtime event (best effort). A Pusher failure is
 * logged but never causes the DB write to be rolled back.
 */
export async function upsertPricingReviewItem(
  input: CreatePricingReviewInput,
): Promise<void> {
  const key = dedupeKey(input.bookingId);
  const title = buildTitle(input);
  const now = new Date();

  let writtenId: string | null = null;
  let writtenAt: Date = now;

  try {
    const existing = await db
      .select({ id: schema.actionQueueItems.id })
      .from(schema.actionQueueItems)
      .where(
        and(
          eq(schema.actionQueueItems.dedupeKey, key),
          eq(schema.actionQueueItems.status, 'OPEN'),
        ),
      )
      .limit(1);

    const existingId = existing[0]?.id ?? null;

    if (existingId) {
      const updated = await db
        .update(schema.actionQueueItems)
        .set({
          title,
          reasons: input.reasons,
          suggestedPayment: input.suggestedPayment,
          recommendedNextSteps: input.recommendedNextSteps,
          updatedAt: now,
        })
        .where(eq(schema.actionQueueItems.id, existingId))
        .returning({
          id: schema.actionQueueItems.id,
          updatedAt: schema.actionQueueItems.updatedAt,
        });
      writtenId = updated[0]?.id ?? existingId;
      writtenAt = updated[0]?.updatedAt ?? now;
    } else {
      const inserted = await db
        .insert(schema.actionQueueItems)
        .values({
          type: PRICING_REVIEW_TYPE,
          bookingId: input.bookingId,
          title,
          reasons: input.reasons,
          suggestedPayment: input.suggestedPayment,
          recommendedNextSteps: input.recommendedNextSteps,
          status: 'OPEN',
          dedupeKey: key,
        })
        .returning({
          id: schema.actionQueueItems.id,
          updatedAt: schema.actionQueueItems.updatedAt,
        });
      writtenId = inserted[0]?.id ?? null;
      writtenAt = inserted[0]?.updatedAt ?? now;
    }
  } catch (err) {
    // DB failure for the action queue must not break booking creation.
    // eslint-disable-next-line no-console
    console.warn('[action-queue] upsertPricingReviewItem db error', err);
    return;
  }

  if (!writtenId) return;

  try {
    const payload: AdminActionQueuePricingReviewUpsertedPayload = {
      id: writtenId,
      bookingId: input.bookingId,
      title,
      safetyLevel: input.safetyLevel,
      reasonsCount: input.reasons.length,
      suggestedPayment: input.suggestedPayment,
      updatedAt: writtenAt.toISOString(),
    };
    await triggerRealtimeEvent(ADMIN_CHANNEL, {
      type: 'admin.action_queue.pricing_review_upserted',
      payload,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // Pusher failure is non-fatal — the DB row already exists and a
    // foreground refetch on the admin app will pick it up.
    // eslint-disable-next-line no-console
    console.warn('[action-queue] pricing_review pusher error', err);
  }

  // Avoid unused import warning if drizzle inlining ever drops `sql`.
  void sql;
}
