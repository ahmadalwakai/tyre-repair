import 'server-only';

import type { AdminPaymentRiskSummary } from '@/lib/payments/admin-payment-risk';
import type { BookingPaymentSummary } from '@/lib/payments/payment-summary';

/**
 * Admin Efficiency Pack — Feature 2: Booking Health Score.
 *
 * Pure function. Reads only data already loaded by the booking detail
 * endpoint. No DB calls, no side effects.
 */

export type BookingHealthSeverity = 'SAFE' | 'WARNING' | 'DANGER' | 'NEUTRAL';

export type BookingHealthStatus =
  | 'READY_TO_DISPATCH'
  | 'NEEDS_PAYMENT'
  | 'NEEDS_LOCATION_CONFIRMATION'
  | 'NEEDS_LOCKING_NUT_CONFIRMATION'
  | 'NEEDS_CUSTOMER_CONTACT'
  | 'HIGH_RISK'
  | 'CANCELLED'
  | 'COMPLETED';

export interface BookingHealthScore {
  status: BookingHealthStatus;
  severity: BookingHealthSeverity;
  score: number;
  title: string;
  message: string;
  missingItems: string[];
  recommendedActions: string[];
}

export interface BookingHealthInput {
  bookingStatus: string;
  jobType: 'ASSESSMENT' | 'REPLACEMENT';
  lockingWheelNutStatus: 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY';
  hasGpsLocation: boolean;
  hasAddress: boolean;
  hasNoAnswerRecorded: boolean;
  paymentSummary: BookingPaymentSummary | null;
  paymentRisk: AdminPaymentRiskSummary | null;
  contactedRecently: boolean;
}

export function getBookingHealthScore(input: BookingHealthInput): BookingHealthScore {
  const missing: string[] = [];
  const actions: string[] = [];

  if (input.bookingStatus === 'cancelled') {
    return {
      status: 'CANCELLED',
      severity: 'NEUTRAL',
      score: 0,
      title: 'Cancelled',
      message: 'This booking has been cancelled.',
      missingItems: [],
      recommendedActions: [],
    };
  }

  if (input.bookingStatus === 'completed') {
    return {
      status: 'COMPLETED',
      severity: 'SAFE',
      score: 100,
      title: 'Completed',
      message: 'Job is complete.',
      missingItems: [],
      recommendedActions: [],
    };
  }

  let score = 100;
  let severity: BookingHealthSeverity = 'SAFE';
  let status: BookingHealthStatus = 'READY_TO_DISPATCH';
  let title = 'Ready to dispatch';
  let message = 'All key items confirmed.';

  // Payment
  const paymentState = input.paymentSummary?.state ?? 'unpaid';
  const paymentBlocking =
    paymentState === 'unpaid' ||
    paymentState === 'failed' ||
    paymentState === 'processing' ||
    paymentState === 'manual_review';
  if (paymentBlocking) {
    score -= 35;
    missing.push('Payment not completed');
    actions.push('Send payment link');
    status = 'NEEDS_PAYMENT';
    title = 'Needs payment';
    message = 'Payment has not been completed.';
    severity = 'DANGER';
  } else if (paymentState === 'deposit_paid_balance_due') {
    score -= 15;
    missing.push('Balance due before dispatch');
    actions.push('Send balance link');
    if (severity === 'SAFE') severity = 'WARNING';
  }

  if (input.paymentRisk && input.paymentRisk.severity !== 'SAFE') {
    if (input.paymentRisk.severity === 'DANGER') {
      score -= 20;
      severity = 'DANGER';
      status = 'HIGH_RISK';
      title = 'Payment risk — review';
      message = input.paymentRisk.title || 'Payment risk detected.';
    } else if (input.paymentRisk.severity === 'WARNING' && severity === 'SAFE') {
      severity = 'WARNING';
    }
  }

  // Locking nut
  if (input.lockingWheelNutStatus === 'NO_KEY') {
    score -= 25;
    missing.push('No locking wheel nut key on hand');
    actions.push('Confirm key situation with customer');
    if (severity !== 'DANGER') {
      severity = 'WARNING';
      status = 'NEEDS_LOCKING_NUT_CONFIRMATION';
      title = 'Confirm locking wheel nut';
      message = 'Customer has no locking wheel nut key — confirm before dispatch.';
    }
  }

  // Location
  if (!input.hasAddress && !input.hasGpsLocation) {
    score -= 25;
    missing.push('No location captured');
    actions.push('Send location request');
    if (severity !== 'DANGER') {
      severity = 'WARNING';
      status = 'NEEDS_LOCATION_CONFIRMATION';
      title = 'Needs location';
      message = 'Customer has not shared a location yet.';
    }
  } else if (!input.hasAddress && input.hasGpsLocation) {
    score -= 5;
    missing.push('GPS pin only — no street address');
    actions.push('Confirm address with customer');
  }

  // Contact
  if (input.hasNoAnswerRecorded && !input.contactedRecently) {
    score -= 10;
    missing.push('Customer marked no-answer');
    actions.push('Try contacting again');
    if (severity === 'SAFE') {
      severity = 'WARNING';
      status = 'NEEDS_CUSTOMER_CONTACT';
      title = 'Customer not reached';
      message = 'Last call attempt was no-answer.';
    }
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return {
    status,
    severity,
    score,
    title,
    message,
    missingItems: missing,
    recommendedActions: actions,
  };
}
