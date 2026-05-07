/**
 * Public-safe projection of `PricingSafetyResult`.
 *
 * Both `/api/quote` and `/api/checkout/session` derive the public payment
 * gate decision from this helper, guaranteeing the UI never shows
 * "Pay now" for a quote that would 409 at checkout.
 *
 * The customer-facing message NEVER reveals internal risk language
 * (no "loss-making", "high risk", "manual review", reasons[]).
 */
import type { PricingSafetyResult } from './types';

export interface PricingSafetyPublic {
  publicPaymentAllowed: boolean;
  safetyLevel: 'NORMAL' | 'REVIEW' | 'HIGH_RISK' | 'BLOCK_PUBLIC_PAYMENT';
  /** Customer-safe message. Null when payment is allowed. */
  customerMessage: string | null;
  /** True when payment is blocked and the customer should call us. */
  callFirst: boolean;
}

const PUBLIC_BLOCKED_MESSAGE =
  'We need to confirm availability for this location. Please call us to complete your emergency booking.';

/**
 * Build the customer-safe pricing-safety projection from the engine result.
 * Pure, synchronous. Safe to call from any route or RSC.
 */
export function buildPricingSafetyPublic(
  safety: PricingSafetyResult,
): PricingSafetyPublic {
  const allowed = safety.publicPaymentAllowed;
  return {
    publicPaymentAllowed: allowed,
    safetyLevel: safety.level,
    customerMessage: allowed ? null : PUBLIC_BLOCKED_MESSAGE,
    callFirst: !allowed,
  };
}
