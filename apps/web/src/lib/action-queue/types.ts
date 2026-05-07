/**
 * Action queue: shared TypeScript types.
 *
 * The `type` column on action_queue_items is a free-form text column, but
 * application code only writes values from this union so the contract stays
 * strongly typed end-to-end.
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
