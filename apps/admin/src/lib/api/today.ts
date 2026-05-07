import { apiGet } from './client';
import type { TodaySummary } from '@/types/command-center';

export async function getToday(signal?: AbortSignal): Promise<TodaySummary> {
  return apiGet<TodaySummary>('/api/admin/today', signal ? { signal } : undefined);
}
