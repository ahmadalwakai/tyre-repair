import type { QuotePricingBreakdown, TyreSearchResultItem } from '@/types/quote';

export interface Phase4QuoteInput {
  tyre: TyreSearchResultItem;
  vatRate: number | null;
}

export interface Phase4QuoteResult {
  pricing: QuotePricingBreakdown;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * @deprecated Phase 5 dynamic pricing engine (`@/lib/pricing`) supersedes this.
 * Do not use for active quotes. Retained only for historical reference / tests.
 */
export function calculatePhase4Quote(input: Phase4QuoteInput): Phase4QuoteResult {
  const basePriceGbp = round2(input.tyre.basePriceGbp);
  const emergencyCalloutEstimateGbp = 0;
  const subtotalGbp = round2(basePriceGbp + emergencyCalloutEstimateGbp);
  const vatRate = typeof input.vatRate === 'number' && input.vatRate >= 0 ? input.vatRate : 0.2;
  const vatAmountGbp = round2(subtotalGbp * vatRate);
  const totalPriceGbp = round2(subtotalGbp + vatAmountGbp);

  return {
    pricing: {
      basePriceGbp,
      emergencyCalloutEstimateGbp,
      subtotalGbp,
      vatRate,
      vatAmountGbp,
      totalPriceGbp,
      notes: [
        'This is a preliminary emergency quote.',
        'Final dynamic pricing rules are completed in the pricing engine phase.',
      ],
    },
  };
}
