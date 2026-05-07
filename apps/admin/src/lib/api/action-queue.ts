import { apiGet } from './client';
import type { ActionQueueResponse } from '@/types/command-center';

export async function getActionQueue(signal?: AbortSignal): Promise<ActionQueueResponse> {
  return apiGet<ActionQueueResponse>('/api/admin/action-queue', signal ? { signal } : undefined);
}
