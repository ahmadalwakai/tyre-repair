import 'server-only';
import type { BookingPaymentSummary } from './payment-summary';

/**
 * Item 9 — Admin Payment Risk Engine.
 *
 * Pure, dependency-free function that converts a `BookingPaymentSummary`
 * into a risk-graded view suitable for admin UI cards, action queues, and
 * the booking detail screen.
 *
 * Hard rules preserved:
 *  - No VAT.
 *  - Assessment-only payment NEVER decrements stock.
 *  - Deposit-only payment NEVER decrements stock.
 *  - Balance / full / adjustment-replacement payment may decrement stock once.
 *  - Failed payment is high risk.
 *  - Cancelled / refunded surfaces clear messaging.
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

export interface AdminPaymentRiskInput {
  summary: BookingPaymentSummary;
  bookingStatus: string;
  hasOpenAdjustment?: boolean;
  openAdjustmentDueGbp?: string | null;
}

function money(value: string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  return (Math.round(n * 100) / 100).toFixed(2);
}

export function getAdminPaymentRisk(input: AdminPaymentRiskInput): AdminPaymentRiskSummary {
  const s = input.summary;
  const isAssessment = s.jobType === 'ASSESSMENT';
  const cancelled = s.isCancelled || input.bookingStatus === 'cancelled';
  const refunded = input.bookingStatus === 'refunded';
  const adjustmentDue = money(input.openAdjustmentDueGbp ?? '0.00');

  const paid = money(s.amountPaidGbp);
  const balanceDue = money(s.balanceDueGbp ?? s.outstandingBalanceGbp ?? '0.00');
  const deposit = money(s.depositPaidGbp);

  // Cancelled / refunded short-circuit
  if (cancelled || refunded) {
    return {
      status: 'CANCELLED',
      severity: 'DANGER',
      title: refunded ? 'Refunded' : 'Booking cancelled',
      message: refunded
        ? 'Booking refunded. No further payment action available.'
        : 'Booking cancelled. No further payment action. Refund (if any) is handled manually.',
      paidAmountGbp: paid,
      balanceDueGbp: balanceDue,
      depositAmountGbp: deposit,
      adjustmentDueGbp: adjustmentDue,
      canSendPaymentLink: false,
      canSendBalanceLink: false,
      canDispatch: false,
      canDecrementStock: false,
      stockDecrementExplanation:
        'Cancelled or refunded bookings never decrement stock.',
    };
  }

  if (s.state === 'manual_review' || s.cancellation?.depositDecision === 'manual_review') {
    return {
      status: 'MANUAL_REVIEW',
      severity: 'WARNING',
      title: 'Manual review required',
      message:
        'This booking needs manual review before any further payment or dispatch action.',
      paidAmountGbp: paid,
      balanceDueGbp: balanceDue,
      depositAmountGbp: deposit,
      adjustmentDueGbp: adjustmentDue,
      canSendPaymentLink: false,
      canSendBalanceLink: false,
      canDispatch: false,
      canDecrementStock: false,
      stockDecrementExplanation:
        'No stock decrement while booking is under manual review.',
    };
  }

  if (s.state === 'failed') {
    return {
      status: 'PAYMENT_FAILED',
      severity: 'DANGER',
      title: 'Payment failed',
      message: 'Payment failed. Contact customer or send a new payment link.',
      paidAmountGbp: paid,
      balanceDueGbp: balanceDue,
      depositAmountGbp: deposit,
      adjustmentDueGbp: adjustmentDue,
      canSendPaymentLink: true,
      canSendBalanceLink: false,
      canDispatch: false,
      canDecrementStock: false,
      stockDecrementExplanation:
        'No payment received. Stock cannot decrement until payment succeeds.',
    };
  }

  if (isAssessment) {
    // Assessment-only flow.
    if (s.state === 'paid_in_full' || s.state === 'balance_paid') {
      return {
        status: 'ASSESSMENT_PAID',
        severity: 'SAFE',
        title: 'Assessment paid',
        message:
          'Assessment fee paid. No stock decrement required. Convert to replacement on site if a tyre is needed.',
        paidAmountGbp: paid,
        balanceDueGbp: balanceDue,
        depositAmountGbp: deposit,
        adjustmentDueGbp: adjustmentDue,
        canSendPaymentLink: false,
        canSendBalanceLink: false,
        canDispatch: true,
        canDecrementStock: false,
        stockDecrementExplanation:
          'Assessment-only payment never decrements stock.',
      };
    }
    return {
      status: 'WAITING_FOR_PAYMENT',
      severity: 'WARNING',
      title: 'Waiting for assessment fee',
      message: 'Send the assessment payment link to the customer to confirm dispatch.',
      paidAmountGbp: paid,
      balanceDueGbp: balanceDue,
      depositAmountGbp: deposit,
      adjustmentDueGbp: adjustmentDue,
      canSendPaymentLink: true,
      canSendBalanceLink: false,
      canDispatch: false,
      canDecrementStock: false,
      stockDecrementExplanation:
        'Assessment-only payment never decrements stock, and dispatch waits for the fee.',
    };
  }

  // REPLACEMENT path
  if (s.state === 'paid_in_full' || s.state === 'balance_paid') {
    return {
      status: 'SAFE_TO_DISPATCH',
      severity: 'SAFE',
      title: 'Paid in full',
      message:
        'Paid in full. Check stock and dispatch safety before completion.',
      paidAmountGbp: paid,
      balanceDueGbp: balanceDue,
      depositAmountGbp: deposit,
      adjustmentDueGbp: adjustmentDue,
      canSendPaymentLink: false,
      canSendBalanceLink: false,
      canDispatch: true,
      canDecrementStock: !s.stockDecremented,
      stockDecrementExplanation: s.stockDecremented
        ? 'Stock has already been decremented for this booking.'
        : 'Replacement payment received in full. Stock may be decremented once on completion.',
    };
  }

  if (s.state === 'deposit_paid_balance_due') {
    return {
      status: 'DEPOSIT_PAID_BALANCE_DUE',
      severity: 'WARNING',
      title: 'Deposit paid — balance due',
      message:
        'Deposit paid. Balance still due before replacement completion. Send balance payment link.',
      paidAmountGbp: paid,
      balanceDueGbp: balanceDue,
      depositAmountGbp: deposit,
      adjustmentDueGbp: adjustmentDue,
      canSendPaymentLink: false,
      canSendBalanceLink: true,
      canDispatch: true,
      canDecrementStock: false,
      stockDecrementExplanation:
        'Deposit alone does not decrement stock. Stock may decrement once balance is paid.',
    };
  }

  if (s.state === 'processing') {
    return {
      status: 'WAITING_FOR_PAYMENT',
      severity: 'WARNING',
      title: 'Payment processing',
      message: 'Payment is processing. Avoid sending another link until it settles.',
      paidAmountGbp: paid,
      balanceDueGbp: balanceDue,
      depositAmountGbp: deposit,
      adjustmentDueGbp: adjustmentDue,
      canSendPaymentLink: false,
      canSendBalanceLink: false,
      canDispatch: false,
      canDecrementStock: false,
      stockDecrementExplanation:
        'Payment not confirmed yet. Stock cannot decrement until succeeded.',
    };
  }

  // unpaid / default
  return {
    status: 'WAITING_FOR_PAYMENT',
    severity: 'WARNING',
    title: 'Waiting for payment',
    message:
      'No payment received yet. Send a payment link to the customer.',
    paidAmountGbp: paid,
    balanceDueGbp: balanceDue,
    depositAmountGbp: deposit,
    adjustmentDueGbp: adjustmentDue,
    canSendPaymentLink: true,
    canSendBalanceLink: false,
    canDispatch: false,
    canDecrementStock: false,
    stockDecrementExplanation:
      'No payment received. Stock cannot decrement until payment succeeds.',
  };
}
