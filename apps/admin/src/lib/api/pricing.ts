import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type { PricingOverride, PricingRule } from '@/types/pricing';

export function listRules(): Promise<{ rules: PricingRule[] }> {
  return apiGet<{ rules: PricingRule[] }>('/api/admin/pricing/rules');
}

export function patchRules(updates: Array<{ key: string; numericValue: number; isActive?: boolean }>): Promise<{
  success: boolean;
  changedKeys: string[];
}> {
  return apiPatch('/api/admin/pricing/rules', { updates });
}

export function listOverrides(): Promise<{ overrides: PricingOverride[] }> {
  return apiGet<{ overrides: PricingOverride[] }>('/api/admin/pricing/overrides');
}

export interface CreateOverrideInput {
  type: 'surge' | 'discount';
  label: string;
  multiplier: number;
  reason?: string;
  startsAt?: string;
  expiresAt?: string;
}

export function createOverride(input: CreateOverrideInput): Promise<{ success: boolean; overrideId: string }> {
  return apiPost('/api/admin/pricing/overrides', input);
}

export function deactivateOverride(overrideId: string): Promise<{ success: boolean; overrideId: string }> {
  return apiDelete(`/api/admin/pricing/overrides/${overrideId}`);
}
