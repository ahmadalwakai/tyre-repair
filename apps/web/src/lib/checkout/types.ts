import type { QuoteJobType, TyreProblemType } from '@/types/quote';

/** Lightweight summary shape used by checkout client surfaces. */
export interface CheckoutQuoteSummary {
  quoteId: string;
  jobType: QuoteJobType;
  tyreProblemType: TyreProblemType | null;
  /** Null when jobType === 'ASSESSMENT'. */
  tyre: {
    brand: string;
    model: string;
    sizeLabel: string;
    speedRating: string | null;
    loadIndex: string | null;
  } | null;
  backupTyre: {
    brand: string;
    model: string;
    sizeLabel: string;
  } | null;
  /** Assessment fee charged when jobType === 'ASSESSMENT'. */
  assessmentFeeGbp: string | null;
  pricing: {
    basePriceGbp: string;
    distanceFeeGbp: string;
    /** Always 0 — business is not VAT registered. */
    vatRate: number;
    /** Always '0.00' — business is not VAT registered. */
    vatAmountGbp: string;
    totalPriceGbp: string;
    currency: 'GBP';
  };
  availability: 'in_stock' | 'low_stock' | 'special_order';
  isSpecialOrder: boolean;
  expiresAt: string | null;
}
