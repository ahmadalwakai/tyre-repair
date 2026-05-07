/**
 * Human-readable labels for enums shown to the operator.
 *
 * Never display raw DB enum values (e.g. "pending_payment") or developer
 * jargon (e.g. "DANGER", "booking_in_progress") — always pass them through
 * one of these helpers first.
 */

export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'dispatching'
  | 'dispatched'
  | 'on_site'
  | 'completed'
  | 'cancelled'
  | 'refunded';

const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  dispatching: 'Dispatching',
  dispatched: 'On the way',
  on_site: 'At customer',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  failed: 'Failed',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  processing: 'Processing',
  succeeded: 'Paid',
  deposit_paid: 'Deposit paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

const ACTION_KIND_LABELS: Record<string, string> = {
  payment_failed: 'Payment failed',
  deposit_balance_due: 'Balance due',
  callback_request: 'Callback wanted',
  pending_adjustment: 'Adjustment unpaid',
  low_stock: 'Low stock',
  locking_nut_no_key: 'Locking nut missing',
  high_priority_notification: 'Priority alert',
  smart_recheck: 'Review later',
  emergency_assist_started: 'Emergency assist',
  website_call_clicked: 'Website call',
  booking_in_progress: 'In checkout',
  booking_abandoned: 'Abandoned checkout',
  pricing_review_required: 'Pricing review',
};

const SEVERITY_LABELS: Record<string, string> = {
  DANGER: 'Urgent',
  WARNING: 'Attention',
  INFO: 'Heads-up',
};

export function bookingStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return BOOKING_STATUS_LABELS[status] ?? friendlySnake(status);
}

export function paymentStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return PAYMENT_STATUS_LABELS[status] ?? friendlySnake(status);
}

export function actionKindLabel(kind: string): string {
  return ACTION_KIND_LABELS[kind] ?? friendlySnake(kind);
}

export function severityLabel(severity: string): string {
  return SEVERITY_LABELS[severity] ?? severity;
}

function friendlySnake(value: string): string {
  const cleaned = value.replace(/_/g, ' ').toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Format a UK phone number for display.
 *   447700900000   -> "07700 900 000"
 *   +447700900000  -> "07700 900 000"
 *   07700900000    -> "07700 900 000"
 *   anything else  -> returned unchanged (best effort)
 */
export function formatUkPhoneForDisplay(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/[^\d+]/g, '');
  let local: string | null = null;
  if (digits.startsWith('+44') && digits.length === 13) {
    local = `0${digits.slice(3)}`;
  } else if (digits.startsWith('44') && digits.length === 12) {
    local = `0${digits.slice(2)}`;
  } else if (digits.startsWith('0') && digits.length === 11) {
    local = digits;
  }
  if (!local) return raw;
  // Common UK mobile/landline grouping: 5 + 3 + 3
  return `${local.slice(0, 5)} ${local.slice(5, 8)} ${local.slice(8)}`.trim();
}

/**
 * Friendly relative time. "just now", "5 min ago", "2 hours ago", "3 days ago".
 */
export function timeAgo(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffMs = nowMs - then;
  if (diffMs < 0) return 'just now';
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} ${hr === 1 ? 'hour' : 'hours'} ago`;
  const day = Math.round(hr / 24);
  return `${day} ${day === 1 ? 'day' : 'days'} ago`;
}
