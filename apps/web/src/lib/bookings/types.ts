import type { BookingStatus } from '@tyrerepair/realtime';

export type LockingWheelNutStatus = 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY';

export interface TrackingTimelineEvent {
  toStatus: BookingStatus;
  fromStatus: BookingStatus | null;
  message: string | null;
  createdAt: string;
}

export interface TrackingBookingResult {
  trackingId: string;
  status: BookingStatus;
  paymentStatus: string;
  totalPriceGbp: string;
  currency: 'GBP';
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  tyre: {
    brand: string;
    model: string;
    sizeLabel: string;
  } | null;
  availability: 'in_stock' | 'low_stock' | 'special_order';
  isSpecialOrder: boolean;
  location: {
    addressLine1: string | null;
    city: string | null;
    postcode: string | null;
  } | null;
  lockingWheelNutStatus: LockingWheelNutStatus;
  jobType: 'ASSESSMENT' | 'REPLACEMENT';
  tyreProblemType:
    | 'PUNCTURE_OR_FLAT'
    | 'DAMAGED_OR_BLOWN_OUT'
    | 'SLOW_PRESSURE_LOSS'
    | 'NEEDS_REPLACEMENT'
    | 'NOT_SURE'
    | null;
  assessmentFeeGbp: string | null;
  backupTyre: {
    brand: string;
    model: string;
    sizeLabel: string;
  } | null;
  timeline: TrackingTimelineEvent[];
}

export type CheckoutPaymentMode = 'FULL' | 'DEPOSIT';

export interface CreatePendingBookingInput {
  quoteId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  lockingWheelNutStatus?: LockingWheelNutStatus;
  checkoutPaymentMode?: CheckoutPaymentMode;
  customerAcceptedDepositTerms?: boolean;
}

export interface CreatePendingBookingResult {
  bookingId: string;
  trackingId: string;
  customerId: string;
  paymentId: string;
  clientSecret: string;
  amountGbp: string;
  currency: 'gbp';
  checkoutPaymentMode: CheckoutPaymentMode;
  depositAmountGbp: string | null;
  balanceDueGbp: string | null;
  totalPriceGbp: string;
}

export type CreatePendingBookingErrorCode =
  | 'invalid_input'
  | 'quote_not_found'
  | 'quote_expired'
  | 'quote_already_booked'
  | 'tyre_unavailable'
  | 'tracking_collision'
  | 'stripe_failed'
  | 'db_error';

export class CreatePendingBookingError extends Error {
  public readonly code: CreatePendingBookingErrorCode;
  public readonly status: number;
  public constructor(code: CreatePendingBookingErrorCode, message: string) {
    super(message);
    this.name = 'CreatePendingBookingError';
    this.code = code;
    this.status =
      code === 'invalid_input'
        ? 400
        : code === 'quote_not_found'
          ? 404
          : code === 'quote_expired' || code === 'quote_already_booked'
            ? 409
            : code === 'tyre_unavailable'
              ? 404
              : 500;
  }
}
