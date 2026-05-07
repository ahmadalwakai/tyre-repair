import { apiGet, apiPatch } from './client';
import type {
  ActionQueueItemDto,
  ActionQueueItemStatus,
  ActionQueueItemType,
  ActionQueueListResponse,
} from '@/types/action-queue-items';

export interface GetActionQueueItemsParams {
  type?: ActionQueueItemType;
  status?: ActionQueueItemStatus;
}

export async function getActionQueueItems(
  params: GetActionQueueItemsParams = {},
  signal?: AbortSignal,
): Promise<ActionQueueListResponse> {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.status) qs.set('status', params.status);
  const path = `/api/admin/action-queue/items${qs.toString() ? `?${qs.toString()}` : ''}`;
  return apiGet<ActionQueueListResponse>(path, signal ? { signal } : undefined);
}

export interface ReviewActionQueueItemInput {
  resolution: 'REVIEWED' | 'DISMISSED';
  note?: string;
}

export interface ReviewActionQueueItemResponse {
  id: string;
  status: 'REVIEWED' | 'DISMISSED';
  reviewedAt: string;
}

export async function reviewActionQueueItem(
  id: string,
  input: ReviewActionQueueItemInput,
): Promise<ReviewActionQueueItemResponse> {
  const body: Record<string, string> = { resolution: input.resolution };
  if (input.note !== undefined) body['note'] = input.note;
  return apiPatch<ReviewActionQueueItemResponse>(
    `/api/admin/action-queue/items/${id}/review`,
    body,
  );
}

/** Convenience: refetch the canonical OPEN PRICING_REVIEW_REQUIRED list. */
export function getOpenPricingReviewItems(
  signal?: AbortSignal,
): Promise<ActionQueueListResponse> {
  return getActionQueueItems(
    { type: 'PRICING_REVIEW_REQUIRED', status: 'OPEN' },
    signal,
  );
}

export type { ActionQueueItemDto };
