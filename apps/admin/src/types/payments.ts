/**
 * Item 9 — Payment risk types mirrored from the web side.
 */
export type AdminPaymentRiskStatus =
  | 'SAFE_TO_DISPATCH'
  | 'WAITING_FOR_PAYMENT'
  | 'DEPOSIT_PAID_BALANCE_DUE'
  | 'PAYMENT_FAILED'
  | 'ASSESSMENT_PAID'
  | 'MANUAL_REVIEW'
  | 'CANCELLED';

export type AdminPaymentRiskSeverity = 'SAFE' | 'WARNING' | 'DANGER';

export interface AdminPaymentRiskSummary {
  status: AdminPaymentRiskStatus;
  severity: AdminPaymentRiskSeverity;
  title: string;
  message: string;
  paidAmountGbp: string;
  balanceDueGbp: string;
  depositAmountGbp: string;
  adjustmentDueGbp: string;
  canSendPaymentLink: boolean;
  canSendBalanceLink: boolean;
  canDispatch: boolean;
  canDecrementStock: boolean;
  stockDecrementExplanation: string;
}

export interface BookingPaymentSummary {
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
  payments: Array<{
    paymentId: string;
    kind: string;
    status: string;
    amountGbp: string;
    paidAt: string | null;
    createdAt: string;
  }>;
}
