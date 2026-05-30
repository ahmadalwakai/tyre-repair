import { apiGet, apiPatch } from './client';
import type {
  PricingThresholds,
  PricingThresholdsPatchResponse,
  PricingThresholdsResponse,
} from '@/types/pricing-settings';

/** GET current pricing thresholds + compiled-in defaults. */
export function getPricingThresholds(): Promise<PricingThresholdsResponse> {
  return apiGet<PricingThresholdsResponse>('/api/admin/settings/pricing');
}

/** PATCH one or more thresholds. Server merges over existing values. */
export function updatePricingThresholds(
  patch: Partial<PricingThresholds>,
): Promise<PricingThresholdsPatchResponse> {
  return apiPatch<PricingThresholdsPatchResponse>('/api/admin/settings/pricing', patch);
}
