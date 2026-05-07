import { db, schema, eq, asc, alias } from '@tyrerepair/db';
import type { BookingStatus } from '@tyrerepair/realtime';
import { trackingIdSchema } from '@/lib/validation/checkout';
import { availabilityFromQuantity } from '@/lib/quote/tyres';
import type { TrackingBookingResult, TrackingTimelineEvent } from './types';

export function normaliseTrackingId(input: string): string {
  return input.trim().toUpperCase();
}

export async function getBookingByTrackingId(
  trackingId: string,
): Promise<TrackingBookingResult | null> {
  const parsed = trackingIdSchema.safeParse(trackingId);
  if (!parsed.success) return null;
  const id = parsed.data;

  const backupTyre = alias(schema.tyreCatalog, 'backup_tyre_track');
  const rows = await db
    .select({
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      status: schema.bookings.status,
      paymentStatus: schema.bookings.paymentStatus,
      createdAt: schema.bookings.createdAt,
      confirmedAt: schema.bookings.confirmedAt,
      cancelledAt: schema.bookings.cancelledAt,
      refundedAt: schema.bookings.refundedAt,
      tyreId: schema.bookings.tyreId,
      tyreBrand: schema.tyreCatalog.brand,
      tyreModel: schema.tyreCatalog.model,
      tyreSize: schema.tyreCatalog.sizeLabel,
      stockQuantity: schema.stock.quantityAvailable,
      stockLowThreshold: schema.stock.lowStockThreshold,
      locAddress1: schema.customerLocations.addressLine1,
      locCity: schema.customerLocations.city,
      locPostcode: schema.customerLocations.postcode,
      quoteTotal: schema.quotes.totalPriceGbp,
      lockingWheelNutStatus: schema.bookings.lockingWheelNutStatus,
      jobType: schema.bookings.jobType,
      tyreProblemType: schema.bookings.tyreProblemType,
      assessmentFeeGbp: schema.bookings.assessmentFeeGbp,
      backupTyreBrand: backupTyre.brand,
      backupTyreModel: backupTyre.model,
      backupTyreSize: backupTyre.sizeLabel,
    })
    .from(schema.bookings)
    .leftJoin(schema.tyreCatalog, eq(schema.tyreCatalog.id, schema.bookings.tyreId))
    .leftJoin(schema.stock, eq(schema.stock.tyreId, schema.bookings.tyreId))
    .leftJoin(
      schema.customerLocations,
      eq(schema.customerLocations.id, schema.bookings.locationId),
    )
    .leftJoin(schema.quotes, eq(schema.quotes.id, schema.bookings.quoteId))
    .leftJoin(backupTyre, eq(backupTyre.id, schema.bookings.backupTyreId))
    .where(eq(schema.bookings.trackingId, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const eventRows = await db
    .select({
      toStatus: schema.bookingEvents.toStatus,
      fromStatus: schema.bookingEvents.fromStatus,
      message: schema.bookingEvents.message,
      createdAt: schema.bookingEvents.createdAt,
    })
    .from(schema.bookingEvents)
    .where(eq(schema.bookingEvents.bookingId, row.bookingId))
    .orderBy(asc(schema.bookingEvents.createdAt));

  const timeline: TrackingTimelineEvent[] = eventRows.map((e) => ({
    toStatus: e.toStatus as BookingStatus,
    fromStatus: e.fromStatus ? (e.fromStatus as BookingStatus) : null,
    message: e.message ?? null,
    createdAt: e.createdAt.toISOString(),
  }));

  const qty = row.stockQuantity ?? 0;
  const low = row.stockLowThreshold ?? 2;
  const availability = availabilityFromQuantity(qty, low);

  return {
    trackingId: row.trackingId,
    status: row.status as BookingStatus,
    paymentStatus: row.paymentStatus,
    totalPriceGbp: row.quoteTotal !== null ? String(Number(row.quoteTotal).toFixed(2)) : '0.00',
    currency: 'GBP',
    createdAt: row.createdAt.toISOString(),
    confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
    refundedAt: row.refundedAt ? row.refundedAt.toISOString() : null,
    tyre: row.tyreBrand
      ? {
          brand: row.tyreBrand,
          model: row.tyreModel ?? '',
          sizeLabel: row.tyreSize ?? '',
        }
      : null,
    availability,
    isSpecialOrder: availability === 'special_order',
    location: row.locAddress1 || row.locPostcode
      ? {
          addressLine1: row.locAddress1 ?? null,
          city: row.locCity ?? null,
          postcode: row.locPostcode ?? null,
        }
      : null,
    lockingWheelNutStatus: row.lockingWheelNutStatus ?? 'STANDARD_ONLY',
    jobType: (row.jobType as 'ASSESSMENT' | 'REPLACEMENT' | null) ?? 'REPLACEMENT',
    tyreProblemType:
      (row.tyreProblemType as TrackingBookingResult['tyreProblemType']) ?? null,
    assessmentFeeGbp: row.assessmentFeeGbp ? String(row.assessmentFeeGbp) : null,
    backupTyre: row.backupTyreBrand
      ? {
          brand: row.backupTyreBrand,
          model: row.backupTyreModel ?? '',
          sizeLabel: row.backupTyreSize ?? '',
        }
      : null,
    timeline,
  };
}
