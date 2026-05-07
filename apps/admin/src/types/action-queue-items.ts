/**
 * Persistent action queue items (Cmd 2).
 *
 * Mirrors apps/web/src/lib/action-queue/types.ts. Keep these two files
 * in sync — the admin app talks to the web API over JSON so the shape
 * must match exactly.
 */

export type ActionQueueItemType =
  | 'WEBSITE_CALL_CLICKED'
  | 'EMERGENCY_ASSIST'
  | 'PRICING_REVIEW_REQUIRED';

export type ActionQueueItemStatus = 'OPEN' | 'REVIEWED' | 'DISMISSED';

export type ActionQueueSuggestedPayment =
  | 'CASH'
  | 'DEPOSIT_15'
  | 'FULL'
  | 'MANUAL_REVIEW';

export interface ActionQueueItemDto {
  id: string;
  type: ActionQueueItemType;
  bookingId: string | null;
  referenceId: string | null;
  title: string;
  reasons: string[];
  suggestedPayment: ActionQueueSuggestedPayment | null;
  recommendedNextSteps: string[];
  status: ActionQueueItemStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionQueueListResponse {
  items: ActionQueueItemDto[];
}
