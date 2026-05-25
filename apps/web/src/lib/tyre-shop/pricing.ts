/**
 * Pure pricing helpers for the Tyre Shop flow.
 *
 * Reuses the existing distance helper for HOME-fitting distance fees so it
 * shares the workshop HQ coordinates and the haversine implementation.
 */
import type {
  FittingMethod,
  TyreShopPriceBreakdown,
  WheelNutAnswer,
} from '@/types/tyre-shop';
import { distanceMilesFromHq } from '@/lib/pricing/distance';
import type { TyreShopFees } from './settings';

export interface CalculateTyreShopQuoteInput {
  basePriceGbp: number;
  quantity: number;
  fittingMethod: FittingMethod;
  effectiveStock: number;
  fees: TyreShopFees;
  /** Required for HOME fitting if you want a distance fee. */
  latitude?: number | null;
  longitude?: number | null;
  wheelNutAnswer: WheelNutAnswer;
}

export interface CalculateTyreShopQuoteResult {
  allowed: boolean;
  blockedReason?: string;
  message?: string;
  available: boolean;
  isBackorder: boolean;
  distanceMiles: number | null;
  outOfCoverage: boolean;
  priceBreakdown: TyreShopPriceBreakdown;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateTyreShopQuote(
  input: CalculateTyreShopQuoteInput,
): CalculateTyreShopQuoteResult {
  const quantity = Math.max(1, Math.floor(input.quantity));
  const tyreTotalGbp = round2(input.basePriceGbp * quantity);

  const fittingFeeGbp =
    input.fittingMethod === 'GARAGE'
      ? round2(input.fees.fittingFeeGarageGbp)
      : round2(input.fees.fittingFeeHomeGbp);

  let distanceMiles: number | null = null;
  let distanceFeeGbp = 0;
  let outOfCoverage = false;

  if (input.fittingMethod === 'HOME') {
    distanceMiles = distanceMilesFromHq(input.latitude, input.longitude);
    if (distanceMiles !== null) {
      if (distanceMiles > input.fees.maxHomeFittingMiles) {
        outOfCoverage = true;
      }
      const billable = Math.max(0, distanceMiles - input.fees.freeDistanceMiles);
      distanceFeeGbp = round2(billable * input.fees.perMileGbp);
    }
  }

  const totalGbp = round2(tyreTotalGbp + fittingFeeGbp + distanceFeeGbp);
  const isBackorder = input.effectiveStock < quantity;

  const priceBreakdown: TyreShopPriceBreakdown = {
    tyreTotalGbp,
    fittingFeeGbp,
    distanceFeeGbp,
    totalGbp,
  };

  // Hard public blocks. Wheel-nut block matches the existing checkout/session
  // wording (`locking_nut_key_missing`) so the UI can render a single message.
  if (input.wheelNutAnswer === 'NO_KEY') {
    return {
      allowed: false,
      blockedReason: 'locking_nut_key_missing',
      message:
        'You must call us before completing your booking. We cannot process payment online without the locking nut key.',
      available: input.effectiveStock > 0,
      isBackorder,
      distanceMiles,
      outOfCoverage,
      priceBreakdown,
    };
  }

  if (input.fittingMethod === 'HOME' && outOfCoverage) {
    return {
      allowed: false,
      blockedReason: 'out_of_coverage',
      message:
        'This address is outside our home-fitting coverage area. Please choose garage fitting or call us.',
      available: input.effectiveStock > 0,
      isBackorder,
      distanceMiles,
      outOfCoverage,
      priceBreakdown,
    };
  }

  if (input.fittingMethod === 'HOME' && (input.latitude == null || input.longitude == null)) {
    return {
      allowed: false,
      blockedReason: 'address_required',
      message:
        'Please confirm your address (use current location or search) so we can calculate the home-fitting fee.',
      available: input.effectiveStock > 0,
      isBackorder,
      distanceMiles,
      outOfCoverage,
      priceBreakdown,
    };
  }

  return {
    allowed: true,
    available: input.effectiveStock > 0,
    isBackorder,
    distanceMiles,
    outOfCoverage,
    priceBreakdown,
  };
}
