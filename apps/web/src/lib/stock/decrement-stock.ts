import { db, schema, sql, eq, and, gt } from '@tyrerepair/db';

export interface DecrementStockInput {
  bookingId: string;
  tyreId: string;
  paymentId: string;
}

export type DecrementStockReason = 'special_order' | 'stock_row_missing' | 'race_lost';

export type DecrementStockResult =
  | {
      decremented: true;
      quantityBefore: number;
      quantityAfter: number;
      lowStockTriggered: boolean;
      lowStockThreshold: number;
    }
  | {
      decremented: false;
      reason: DecrementStockReason;
    };

/**
 * Atomically decrements stock for a paid booking.
 *
 * Uses a single conditional UPDATE that only succeeds when
 * `quantity_available > 0`, so concurrent webhook retries cannot drive
 * stock below zero. The `WHERE` clause provides the atomicity guarantee.
 */
export async function decrementStockForPaidBooking(
  input: DecrementStockInput,
): Promise<DecrementStockResult> {
  const beforeRows = await db
    .select({
      quantityAvailable: schema.stock.quantityAvailable,
      lowStockThreshold: schema.stock.lowStockThreshold,
    })
    .from(schema.stock)
    .where(eq(schema.stock.tyreId, input.tyreId))
    .limit(1);
  const before = beforeRows[0];
  if (!before) return { decremented: false, reason: 'stock_row_missing' };
  if (before.quantityAvailable <= 0) {
    return { decremented: false, reason: 'special_order' };
  }

  const updated = await db
    .update(schema.stock)
    .set({
      quantityAvailable: sql`${schema.stock.quantityAvailable} - 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.stock.tyreId, input.tyreId),
        gt(schema.stock.quantityAvailable, 0),
      ),
    )
    .returning({
      quantityAvailable: schema.stock.quantityAvailable,
      lowStockThreshold: schema.stock.lowStockThreshold,
    });
  const after = updated[0];
  if (!after) {
    return { decremented: false, reason: 'race_lost' };
  }

  const quantityAfter = after.quantityAvailable;
  const lowStockTriggered = quantityAfter <= after.lowStockThreshold;
  return {
    decremented: true,
    quantityBefore: before.quantityAvailable,
    quantityAfter,
    lowStockTriggered,
    lowStockThreshold: after.lowStockThreshold,
  };
}
