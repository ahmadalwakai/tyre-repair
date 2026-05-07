import { apiGet } from './client';
import type { LiveVisitorsResponse } from '@/types/visitors';

export function listLiveVisitors(): Promise<LiveVisitorsResponse> {
  return apiGet<LiveVisitorsResponse>('/api/admin/visitors/live');
}
