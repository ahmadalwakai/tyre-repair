/**
 * Lightweight pricing-safety evaluator for stored bookings.
 *
 * Used by the Action Queue and the Today report to decide which bookings need
 * a "Pricing review required" surface, WITHOUT re-running the full dynamic
 * pricing engine (which fetches weather + counts live demand on every call).
 *
 * It uses only fields already on the booking row plus the customer-location
 * lat/lng to compute haversine distance, then delegates to the existing
 * synchronous `calculatePricingSafety()` profit-guard function.
 */
import { distanceMilesFromHq } from '@/lib/pricing/distance';
import { calculatePricingSafetySync } from '@/lib/pricing/profit-guard';
import {
  getPricingThresholds,
  PRICING_THRESHOLD_DEFAULTS,
  type PricingThresholds,
} from '@/lib/settings/pricing-settings';
import type {
  LocationConfidence,
  LockingWheelNutStatus,
  ProposedPaymentMode,
} from '@/lib/pricing/profit-guard';
import type { PricingSafetyResult, QuoteJobType } from '@/lib/pricing/types';

export interface BookingPricingSafetyInput {
  jobType: QuoteJobType;
  totalPriceGbp: string;
  /** Booking's resolved customer location (if any). */
  latitude: number | null;
  longitude: number | null;
  /** Whether the location row has a confirmed address (vs GPS-only). */
  hasConfirmedAddress: boolean;
  lockingWheelNutStatus: LockingWheelNutStatus | null;
  paymentMode: ProposedPaymentMode | null;
}

export interface BookingPricingSafetyOutput {
  safety: PricingSafetyResult;
  distanceMiles: number | null;
}

export function evaluateBookingPricingSafety(
  input: BookingPricingSafetyInput,
  thresholds: PricingThresholds = PRICING_THRESHOLD_DEFAULTS,
): BookingPricingSafetyOutput {
  const distanceMiles = distanceMilesFromHq(input.latitude, input.longitude);

  const locationConfidence: LocationConfidence =
    input.latitude == null || input.longitude == null
      ? 'MISSING_LOCATION'
      : input.hasConfirmedAddress
        ? 'CONFIRMED_ADDRESS'
        : 'GPS_ONLY';

  const safety = calculatePricingSafetySync(
    {
      jobType: input.jobType,
      distanceMiles,
      locationConfidence,
      finalTotalGbp: input.totalPriceGbp,
      ...(input.lockingWheelNutStatus
        ? { lockingWheelNutStatus: input.lockingWheelNutStatus }
        : {}),
      ...(input.paymentMode ? { paymentMode: input.paymentMode } : {}),
      // Time / weather / demand are not stored per-booking, so we omit them.
      // The profit-guard already treats them as "no signal" when missing.
    },
    thresholds,
  );

  return { safety, distanceMiles };
}

/**
 * Async wrapper that fetches the live thresholds (cached) before evaluating.
 * Use this when you only need to evaluate a single booking; for hot loops,
 * call {@link getPricingThresholds} once and pass the result to the sync
 * variant above.
 */
export async function evaluateBookingPricingSafetyAsync(
  input: BookingPricingSafetyInput,
): Promise<BookingPricingSafetyOutput> {
  const thresholds = await getPricingThresholds();
  return evaluateBookingPricingSafety(input, thresholds);
}
