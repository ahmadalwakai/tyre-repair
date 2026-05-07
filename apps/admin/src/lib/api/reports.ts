import { apiGet } from './client';
import type { PricingTodayReport } from '@/types/reports';

export async function getPricingTodayReport(
  options?: { fresh?: boolean; signal?: AbortSignal },
): Promise<PricingTodayReport> {
  const path = options?.fresh
    ? '/api/admin/reports/pricing-today?fresh=1'
    : '/api/admin/reports/pricing-today';
  return apiGet<PricingTodayReport>(path, options?.signal ? { signal: options.signal } : undefined);
}
