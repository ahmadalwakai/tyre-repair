/**
 * Shared TypeScript types for the Tyre Shop flow.
 *
 * Used by both the public web client (apps/web) and the server-side API
 * routes under /api/tyre-shop. Keep names stable — they are part of the
 * wire contract between the browser and the Next.js route handlers.
 *
 * No `any`. All optional fields use `?:` to avoid `T | undefined` noise on
 * consumers that spread these into JSON payloads.
 */

export type FittingMethod = 'GARAGE' | 'HOME';

export type WheelNutAnswer = 'HAS_KEY' | 'NO_KEY';

export type TyreShopOrderStatus =
  | 'DRAFT'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type TyreShopPaymentStatus = 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED';

export type TyreShopStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface TyreShopItem {
  id: string;
  sizeLabel: string;
  width: number | null;
  profile: number | null;
  rim: number | null;
  brand: string;
  model: string;
  tier: string;
  season: string | null;
  basePriceGbp: number;
  fastFitAvailable: boolean;
  effectiveStock: number;
  stockStatus: TyreShopStockStatus;
}

export interface TyreShopFilters {
  sizeLabel?: string;
  brand?: string;
  tier?: string;
  season?: string;
  inStockOnly?: boolean;
}

export interface TyreAvailabilityRequest {
  tyreCatalogId: string;
  quantity: number;
}

export interface TyreAvailabilityResponse {
  available: boolean;
  effectiveStock: number;
  canOrderWithin3WorkingDays: boolean;
  message?: string;
}

export interface TyreShopAddress {
  line1?: string;
  line2?: string;
  city?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
}

export interface TyreShopSelectedSlot {
  date: string;
  time: string;
}

export interface TyreShopQuoteRequest {
  tyreCatalogId: string;
  quantity: number;
  fittingMethod: FittingMethod;
  address?: TyreShopAddress;
  selectedSlot: TyreShopSelectedSlot;
  wheelNutAnswer: WheelNutAnswer;
  acceptsBackorder?: boolean;
}

export interface TyreShopPriceBreakdown {
  tyreTotalGbp: number;
  fittingFeeGbp: number;
  distanceFeeGbp: number;
  totalGbp: number;
}

export interface TyreShopQuoteResponse {
  allowed: boolean;
  blockedReason?: string;
  available: boolean;
  isBackorder: boolean;
  expectedReadyDate?: string;
  distanceMiles?: number;
  priceBreakdown?: TyreShopPriceBreakdown;
  message?: string;
}

export interface TyreShopOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tyreCatalogId: string;
  quantity: number;
  fittingMethod: FittingMethod;
  fittingAddress?: TyreShopAddress;
  distanceMiles?: number;
  fittingFeeGbp: number;
  distanceFeeGbp: number;
  tyreTotalGbp: number;
  totalGbp: number;
  status: TyreShopOrderStatus;
  paymentStatus: TyreShopPaymentStatus;
  stripeCheckoutSessionId?: string;
  selectedSlot: TyreShopSelectedSlot;
  wheelNutAnswer: WheelNutAnswer;
  isBackorder: boolean;
  expectedReadyDate?: string;
  createdAt: string;
  updatedAt: string;
}
