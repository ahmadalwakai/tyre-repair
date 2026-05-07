import { apiGet } from './client';
import type { DashboardSummary } from '@/types/dashboard';

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>('/api/admin/dashboard/summary');
}
