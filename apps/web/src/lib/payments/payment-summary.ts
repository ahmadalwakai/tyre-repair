import 'server-only';
import { db, schema, eq, and, desc } from '@tyrerepair/db';

/**
 * Payment summary helpers — Final Safety Pack Bundle C.
 *
 * Strict rules:
 *  - Only payments with status === 'succeeded' count as paid.
 *  - No VAT calculations.
 *  - Admin summary may include adjustments + cancellation context.
 *  - Customer summary is filtered: never includes admin notes, internal
 *    metadata, deposit decision, or refund-review wording.
 */

export type BookingPaymentState =
  | 'unpaid'
  | 'processing'
  | 'paid_in_full'
  | 'deposit_paid_balance_due'
  | 'balance_paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'manual_review';

export type CustomerPaymentTone = 'green' | 'amber' | 'red' | 'purple' | 'neutral';

export interface BookingPaymentSummary {
  bookingId: string;
  trackingId: string;
  state: BookingPaymentState;
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

export interface CustomerPaymentSummary {
  state: BookingPaymentState;
  tone: CustomerPaymentTone;
  headline: string;
  detail: string;
  amountPaidGbp: string;
  totalPriceGbp: string | null;
  balanceDueGbp: string | null;
  isCancelled: boolean;
  cancellationHeadline: string | null;
}

function toMoney(n: number): string {
  if (!Number.isFinite(n)) return '0.00';
  return (Math.round(n * 100) / 100).toFixed(2);
}

export async function getBookingPaymentSummary(
  bookingId: string,
): Promise<BookingPaymentSummary | null> {
  const bookingRows = await db
    .select({
      id: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      status: schema.bookings.status,
      paymentStatus: schema.bookings.paymentStatus,
      checkoutPaymentMode: schema.bookings.checkoutPaymentMode,
      depositAmountGbp: schema.bookings.depositAmountGbp,
      balanceDueGbp: schema.bookings.balanceDueGbp,
      stockDecrementedAt: schema.bookings.stockDecrementedAt,
      jobType: schema.bookings.jobType,
      assessmentFeeGbp: schema.bookings.assessmentFeeGbp,
    })
    .from(schema.bookings)
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);
  const booking = bookingRows[0];
  if (!booking) return null;

  // All payments for booking (succeeded + others, for transparency).
  const paymentRows = await db
    .select({
      id: schema.payments.id,
      kind: schema.payments.paymentKind,
      status: schema.payments.status,
      amountGbp: schema.payments.amountGbp,
      paidAt: schema.payments.paidAt,
      createdAt: schema.payments.createdAt,
    })
    .from(schema.payments)
    .where(eq(schema.payments.bookingId, bookingId))
    .orderBy(desc(schema.payments.createdAt));

  let depositPaid = 0;
  let balancePaid = 0;
  let adjustmentPaid = 0;
  let amountPaid = 0;
  let hasFailed = false;
  let hasProcessing = false;

  for (const p of paymentRows) {
    const amt = Number(p.amountGbp);
    if (p.status === 'succeeded' && Number.isFinite(amt) && amt > 0) {
      amountPaid += amt;
      if (p.kind === 'deposit') depositPaid += amt;
      else if (p.kind === 'balance') balancePaid += amt;
      else if (p.kind === 'adjustment') adjustmentPaid += amt;
    }
    if (p.status === 'failed') hasFailed = true;
    if (p.status === 'processing') hasProcessing = true;
  }

  // Adjustments — succeeded only
  const adjRows = await db
    .select({
      additionalAmountGbp: schema.bookingAdjustments.additionalAmountGbp,
      totalReplacementAmountGbp: schema.bookingAdjustments.totalReplacementAmountGbp,
      status: schema.bookingAdjustments.status,
    })
    .from(schema.bookingAdjustments)
    .where(eq(schema.bookingAdjustments.bookingId, bookingId));

  // Total price target: prefer most recent paid replacement total; fallback
  // to deposit + balance; fallback to assessment fee for ASSESSMENT bookings.
  let totalPrice: number | null = null;
  const paidReplacement = adjRows
    .filter((a) => a.status === 'paid')
    .reduce(
      (max, a) => Math.max(max, Number(a.totalReplacementAmountGbp) || 0),
      0,
    );
  if (paidReplacement > 0) {
    totalPrice = paidReplacement;
  } else {
    const dep = Number(booking.depositAmountGbp) || 0;
    const bal = Number(booking.balanceDueGbp) || 0;
    if (dep + bal > 0) totalPrice = dep + bal;
    else if (booking.jobType === 'ASSESSMENT' && booking.assessmentFeeGbp) {
      const af = Number(booking.assessmentFeeGbp);
      if (af > 0) totalPrice = af;
    } else if (amountPaid > 0) {
      totalPrice = amountPaid;
    }
  }

  let outstanding = 0;
  if (totalPrice !== null) outstanding = Math.max(0, totalPrice - amountPaid);

  // Cancellation row — most recent
  const cancellationRows = await db
    .select({
      stage: schema.bookingCancellations.stage,
      reason: schema.bookingCancellations.reason,
      depositDecision: schema.bookingCancellations.depositDecision,
      retainedAmountGbp: schema.bookingCancellations.retainedAmountGbp,
      refundDueGbp: schema.bookingCancellations.refundDueGbp,
    })
    .from(schema.bookingCancellations)
    .where(eq(schema.bookingCancellations.bookingId, bookingId))
    .orderBy(desc(schema.bookingCancellations.createdAt))
    .limit(1);
  const cancellation = cancellationRows[0] ?? null;

  const isCancelled = booking.status === 'cancelled';
  const isRefunded = booking.status === 'refunded';

  let state: BookingPaymentState = 'unpaid';
  if (isRefunded) state = 'refunded';
  else if (isCancelled) state = 'cancelled';
  else if (cancellation && cancellation.depositDecision === 'manual_review') {
    state = 'manual_review';
  } else if (totalPrice !== null && amountPaid >= totalPrice && totalPrice > 0) {
    state = balancePaid > 0 && depositPaid > 0 ? 'balance_paid' : 'paid_in_full';
  } else if (depositPaid > 0 && outstanding > 0) {
    state = 'deposit_paid_balance_due';
  } else if (hasProcessing) {
    state = 'processing';
  } else if (hasFailed && amountPaid === 0) {
    state = 'failed';
  } else {
    state = 'unpaid';
  }

  // Cross-check booking.paymentStatus for safety
  if (booking.paymentStatus === 'failed' && amountPaid === 0) state = 'failed';

  return {
    bookingId: booking.id,
    trackingId: booking.trackingId,
    state,
    totalPriceGbp: totalPrice !== null ? toMoney(totalPrice) : null,
    amountPaidGbp: toMoney(amountPaid),
    depositPaidGbp: toMoney(depositPaid),
    balancePaidGbp: toMoney(balancePaid),
    adjustmentPaidGbp: toMoney(adjustmentPaid),
    outstandingBalanceGbp: toMoney(outstanding),
    depositRequiredGbp: booking.depositAmountGbp ?? null,
    balanceDueGbp:
      outstanding > 0 ? toMoney(outstanding) : booking.balanceDueGbp ?? null,
    stockDecremented: !!booking.stockDecrementedAt,
    jobType: booking.jobType as 'ASSESSMENT' | 'REPLACEMENT',
    isCancelled,
    cancellation: cancellation
      ? {
          stage: cancellation.stage,
          reason: cancellation.reason,
          depositDecision: cancellation.depositDecision,
          retainedAmountGbp: cancellation.retainedAmountGbp ?? null,
          refundDueGbp: cancellation.refundDueGbp ?? null,
        }
      : null,
    payments: paymentRows.map((p) => ({
      paymentId: p.id,
      kind: p.kind,
      status: p.status,
      amountGbp: p.amountGbp,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

/**
 * Filter the admin summary into a customer-safe view used on the public
 * tracking page. NEVER includes admin notes, refund amounts, retained
 * amounts, or deposit decisions. Only calm wording.
 */
export function formatPaymentSummaryForCustomer(
  summary: BookingPaymentSummary,
): CustomerPaymentSummary {
  let tone: CustomerPaymentTone = 'neutral';
  let headline = 'Awaiting payment';
  let detail = '';

  switch (summary.state) {
    case 'paid_in_full':
    case 'balance_paid':
      tone = 'green';
      headline = 'Payment received in full';
      detail = `Total paid: £${summary.amountPaidGbp}.`;
      break;
    case 'deposit_paid_balance_due':
      tone = 'amber';
      headline = 'Deposit received — balance due on completion';
      detail = `Paid so far: £${summary.amountPaidGbp}. Balance due: £${summary.balanceDueGbp ?? '0.00'}.`;
      break;
    case 'processing':
      tone = 'amber';
      headline = 'Payment processing';
      detail = 'Your payment is being confirmed. This usually takes a few seconds.';
      break;
    case 'failed':
      tone = 'red';
      headline = 'Payment failed';
      detail = 'The last payment attempt did not go through. Please try again or contact us.';
      break;
    case 'refunded':
      tone = 'purple';
      headline = 'Refund recorded';
      detail = 'TyreRepair UK will contact you about the next steps.';
      break;
    case 'cancelled':
      tone = 'red';
      headline = 'Booking cancelled';
      detail = '';
      break;
    case 'manual_review':
      tone = 'purple';
      headline = 'Under review';
      detail = 'TyreRepair UK is reviewing this booking. You will be contacted shortly.';
      break;
    case 'unpaid':
    default:
      tone = 'neutral';
      headline = 'Awaiting payment';
      detail = summary.totalPriceGbp
        ? `Total: £${summary.totalPriceGbp}.`
        : '';
      break;
  }

  return {
    state: summary.state,
    tone,
    headline,
    detail,
    amountPaidGbp: summary.amountPaidGbp,
    totalPriceGbp: summary.totalPriceGbp,
    balanceDueGbp: summary.balanceDueGbp,
    isCancelled: summary.isCancelled,
    cancellationHeadline: summary.isCancelled
      ? 'This booking has been cancelled. If you were charged a deposit, TyreRepair UK will contact you about the next steps.'
      : null,
  };
}
