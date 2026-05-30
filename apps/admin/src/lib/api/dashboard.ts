import { apiGet } from './client';
import type { DashboardSummary } from '@/types/dashboard';

export function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>(
    '/api/admin/dashboard/summary',
    signal ? { signal } : undefined,
  );
}
