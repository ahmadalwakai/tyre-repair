import { apiGet, apiPost } from './client';

export interface AuditLogItem {
  id: string;
  actorType: string;
  actorAdminId: string | null;
  actorLabel: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  bookingId: string | null;
  paymentId: string | null;
  adjustmentId: string | null;
  stockId: string | null;
  callbackRequestId: string | null;
  before: unknown;
  after: unknown;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogListResponse {
  items: AuditLogItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface AuditLogQuery {
  bookingId?: string;
  entityType?: string;
  action?: string;
  actorAdminId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export function listAuditLogs(q: AuditLogQuery = {}): Promise<AuditLogListResponse> {
  const params = new URLSearchParams();
  if (q.bookingId) params.set('bookingId', q.bookingId);
  if (q.entityType) params.set('entityType', q.entityType);
  if (q.action) params.set('action', q.action);
  if (q.actorAdminId) params.set('actorAdminId', q.actorAdminId);
  if (q.from) params.set('from', q.from);
  if (q.to) params.set('to', q.to);
  if (q.cursor) params.set('cursor', q.cursor);
  if (typeof q.limit === 'number') params.set('limit', String(q.limit));
  const qs = params.toString();
  return apiGet<AuditLogListResponse>(`/api/admin/audit-logs${qs ? `?${qs}` : ''}`);
}

export interface BookingPaymentSummaryResponse {
  bookingId: string;
  trackingId: string;
  state: string;
  totalPriceGbp: string | null;
  amountPaidGbp: string;
  depositPaidGbp: string;
  balancePaidGbp: string;
  adjustmentPaidGbp: string;
  outstandingBalanceGbp: string;
  depositRequiredGbp: string | null;
  balanceDueGbp: string | null;
  stockDecremented: boolean;
  jobType: 'ASSESSMENT' | 'REPLACEMENT';
  isCancelled: boolean;
  cancellation: {
    stage: string;
    reason: string;
    depositDecision: string;
    retainedAmountGbp: string | null;
    refundDueGbp: string | null;
  } | null;
  payments: Array<{
    paymentId: string;
    kind: string;
    status: string;
    amountGbp: string;
    paidAt: string | null;
    createdAt: string;
  }>;
}

export function getBookingPaymentSummary(
  bookingId: string,
): Promise<BookingPaymentSummaryResponse> {
  return apiGet<BookingPaymentSummaryResponse>(
    `/api/admin/bookings/${bookingId}/payment-summary`,
  );
}

export type CancellationStage =
  | 'before_dispatch'
  | 'after_dispatch'
  | 'on_site'
  | 'after_work_started'
  | 'customer_no_show'
  | 'cannot_complete';

export type CancellationDepositDecision =
  | 'not_applicable'
  | 'refund_deposit'
  | 'retain_deposit'
  | 'partial_refund'
  | 'balance_due'
  | 'manual_review';

export interface CancelBookingInput {
  stage: CancellationStage;
  reason: string;
  depositDecision: CancellationDepositDecision;
  retainedAmountGbp?: string;
  refundDueGbp?: string;
  balanceDueGbp?: string;
  customerMessage?: string;
  internalNotes?: string;
}

export interface CancelBookingResponse {
  success: boolean;
  bookingId: string;
  cancellationId: string | null;
  status: 'cancelled';
  depositDecision: CancellationDepositDecision;
  emailSent: boolean;
  emailSkippedReason?: string;
}

export function cancelBooking(
  bookingId: string,
  input: CancelBookingInput,
): Promise<CancelBookingResponse> {
  return apiPost<CancelBookingResponse>(
    `/api/admin/bookings/${bookingId}/cancel`,
    input as unknown as Record<string, unknown>,
  );
}

export interface CashReconciliationItem {
  bookingId: string;
  trackingId: string | null;
  status: string | null;
  paymentStatus: string | null;
  jobType: string | null;
  customerName: string | null;
  paidGbp: string;
  depositGbp: string;
  balanceGbp: string;
  adjustmentGbp: string;
  balanceDueGbp: string | null;
  cancellation: {
    depositDecision: string;
    retainedGbp: string | null;
    refundDueGbp: string | null;
  } | null;
}

export interface CashReconciliationResponse {
  date: string;
  fromUtc: string;
  toUtc: string;
  collectedTotalGbp: string;
  fullPaymentsGbp: string;
  depositPaymentsGbp: string;
  balancePaymentsGbp: string;
  adjustmentPaymentsGbp: string;
  refundMarkedGbp: string;
  depositRetainedGbp: string;
  outstandingBalanceGbp: string;
  failedPaymentsCount: number;
  cancelledBookingsCount: number;
  paidBookingsCount: number;
  depositBookingsCount: number;
  assessmentBookingsCount: number;
  replacementBookingsCount: number;
  items: CashReconciliationItem[];
}

export function getCashReconciliation(date?: string): Promise<CashReconciliationResponse> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiGet<CashReconciliationResponse>(`/api/admin/reports/cash-reconciliation${qs}`);
}
