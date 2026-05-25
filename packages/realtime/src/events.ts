/**
 * Discriminated union of every realtime event the platform can emit.
 * Every event uses ISO date strings for timestamps so the payload survives
 * JSON serialization across Pusher / WebSocket boundaries.
 */

export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'dispatching'
  | 'dispatched'
  | 'on_site'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed';

export type PaymentStatus =
  | 'unpaid'
  | 'requires_payment_method'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'deposit_paid';

export type PricingOverrideType = 'surge' | 'discount';
export type PricingOverrideStatus = 'active' | 'inactive' | 'expired';

export interface BookingCreatedPayload {
  bookingId: string;
  trackingId: string;
  customerName: string;
  phone: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalPriceGbp: string;
  createdAt: string;
  /** Customer's reported state of locking wheel nut at checkout. */
  lockingWheelNutStatus?: 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY';
  /** ASSESSMENT triage callouts skip stock decrement and have no preselected tyre. */
  jobType?: 'ASSESSMENT' | 'REPLACEMENT';
  tyreProblemType?:
    | 'PUNCTURE_OR_FLAT'
    | 'DAMAGED_OR_BLOWN_OUT'
    | 'SLOW_PRESSURE_LOSS'
    | 'NEEDS_REPLACEMENT'
    | 'NOT_SURE'
    | null;
  assessmentFeeGbp?: string | null;
  backupTyreId?: string | null;
  /** Optional contact / location enrichment to power the admin booking popup. */
  customerEmail?: string | null;
  vehicleRegistration?: string | null;
  locationLabel?: string | null;
  postcode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  paymentMode?: 'FULL' | 'DEPOSIT';
  /** When the customer's quote was originally created (ISO). */
  quoteCreatedAt?: string | null;
  /** Booking source ('tyre_shop' for public Buy Tyres orders). */
  source?: string | null;
  /** Buy Tyres scheduled-fitting metadata (only set when source === 'tyre_shop'). */
  fittingMethod?: 'GARAGE' | 'HOME' | null;
  quantity?: number | null;
  scheduledAt?: string | null;
  slotLabel?: string | null;
  isBackorder?: boolean | null;
}

export interface BookingStatusUpdatedPayload {
  bookingId: string;
  trackingId: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  updatedAt: string;
}

export interface PaymentSucceededPayload {
  bookingId: string;
  trackingId: string;
  paymentId: string;
  amountGbp: string;
  paidAt: string;
}

export interface PaymentFailedPayload {
  bookingId: string;
  trackingId: string;
  paymentId: string;
  reason: string;
  failedAt: string;
}

export interface PaymentRefundedPayload {
  bookingId: string;
  trackingId: string;
  paymentId: string;
  amountGbp: string;
  refundedAt: string;
}

export interface StockLowPayload {
  tyreId: string;
  sku: string;
  sizeLabel: string;
  brand: string;
  model: string;
  quantityAvailable: number;
  lowStockThreshold: number;
}

export interface StockUpdatedPayload {
  tyreId: string;
  sku: string;
  quantityAvailable: number;
  updatedAt: string;
}

export interface PricingRulesUpdatedPayload {
  changedKeys: string[];
  updatedByAdminId: string | null;
  updatedAt: string;
}

export interface PricingOverrideUpdatedPayload {
  overrideId: string;
  type: PricingOverrideType;
  status: PricingOverrideStatus;
  multiplier: string;
  label: string;
  updatedAt: string;
}

export interface VisitorUpdatedPayload {
  visitorId: string;
  currentPage: string | null;
  approxCity: string | null;
  approxRegion: string | null;
  lastSeenAt: string;
}

export interface HealthPingPayload {
  service: string;
  status: 'ok' | 'degraded';
  checkedAt: string;
}

export interface CallbackRequestedPayload {
  callbackRequestId: string;
  fullName?: string | null;
  phone: string;
  tyreProblemType?:
    | 'PUNCTURE_OR_FLAT'
    | 'DAMAGED_OR_BLOWN_OUT'
    | 'SLOW_PRESSURE_LOSS'
    | 'NEEDS_REPLACEMENT'
    | 'NOT_SURE'
    | null;
  sourcePage?: string | null;
  createdAt: string;
}

export interface BookingAdjustmentCreatedPayload {
  bookingId: string;
  trackingId: string;
  adjustmentId: string;
  additionalAmountGbp: string;
  tyreId: string | null;
  createdAt: string;
}

export interface BookingAdjustmentPaidPayload {
  bookingId: string;
  trackingId: string;
  adjustmentId: string;
  amountGbp: string;
  paidAt: string;
}

export interface LeadCallClickedPayload {
  callClickEventId: string;
  sourcePage?: string | null;
  sourceComponent?: string | null;
  quoteId?: string | null;
  bookingId?: string | null;
  phone?: string | null;
  customerName?: string | null;
  tyreProblemType?:
    | 'PUNCTURE_OR_FLAT'
    | 'DAMAGED_OR_BLOWN_OUT'
    | 'SLOW_PRESSURE_LOSS'
    | 'NEEDS_REPLACEMENT'
    | 'NOT_SURE'
    | null;
  jobType?: 'ASSESSMENT' | 'REPLACEMENT' | null;
  /** Approximate caller location derived from the network IP (city-level). */
  networkCity?: string | null;
  networkRegion?: string | null;
  networkCountry?: string | null;
  createdAt: string;
}

export interface PaymentDepositSucceededPayload {
  bookingId: string;
  trackingId: string;
  paymentId: string;
  depositAmountGbp: string;
  balanceDueGbp: string;
  paidAt: string;
}

export interface PaymentBalanceSucceededPayload {
  bookingId: string;
  trackingId: string;
  paymentId: string;
  amountGbp: string;
  paidAt: string;
}

export interface EmergencyAssistCreatedPayload {
  eventId: string;
  source: string;
  page: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'CONTINUED_TO_LOCATION' | 'CONVERTED_TO_QUOTE' | 'EXPIRED';
  message: string;
  priority: 'HIGH';
  vehicleRegistration?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  locationLabel?: string | null;
  tyreProblemType?:
    | 'PUNCTURE_OR_FLAT'
    | 'DAMAGED_OR_BLOWN_OUT'
    | 'SLOW_PRESSURE_LOSS'
    | 'NEEDS_REPLACEMENT'
    | 'NOT_SURE'
    | null;
  jobType?: 'ASSESSMENT' | 'REPLACEMENT' | null;
  createdAt: string;
}

export interface BookingCheckoutStartedPayload {
  quoteId: string;
  jobType: 'ASSESSMENT' | 'REPLACEMENT';
  tyreProblemType?:
    | 'PUNCTURE_OR_FLAT'
    | 'DAMAGED_OR_BLOWN_OUT'
    | 'SLOW_PRESSURE_LOSS'
    | 'NEEDS_REPLACEMENT'
    | 'NOT_SURE'
    | null;
  totalPriceGbp: string;
  paymentMode: 'FULL' | 'DEPOSIT';
  page: string;
  startedAt: string;
  /** When the customer's quote was originally created (ISO). */
  quoteCreatedAt?: string | null;
}

export type EmergencyAssistLocationConfidence =
  | 'CONFIRMED_ADDRESS'
  | 'GPS_ONLY'
  | 'WEAK_ADDRESS'
  | 'MISSING_LOCATION';

export interface EmergencyAssistLocationUpdatedPayload {
  eventId: string;
  status:
    | 'NEW'
    | 'ACKNOWLEDGED'
    | 'CONTINUED_TO_LOCATION'
    | 'CONVERTED_TO_QUOTE'
    | 'EXPIRED';
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  locationConfidence: EmergencyAssistLocationConfidence;
  updatedAt: string;
}

export interface AdminActionQueuePricingReviewUpsertedPayload {
  /** action_queue_items.id (uuid) */
  id: string;
  bookingId: string;
  title: string;
  safetyLevel: 'HIGH_RISK' | 'BLOCK_PUBLIC_PAYMENT';
  reasonsCount: number;
  suggestedPayment: 'CASH' | 'DEPOSIT_15' | 'FULL' | 'MANUAL_REVIEW' | null;
  updatedAt: string;
}

export type RealtimeEvent =
  | { type: 'booking.created'; payload: BookingCreatedPayload; createdAt: string }
  | { type: 'booking.status.updated'; payload: BookingStatusUpdatedPayload; createdAt: string }
  | { type: 'payment.succeeded'; payload: PaymentSucceededPayload; createdAt: string }
  | { type: 'payment.failed'; payload: PaymentFailedPayload; createdAt: string }
  | { type: 'payment.refunded'; payload: PaymentRefundedPayload; createdAt: string }
  | { type: 'stock.low'; payload: StockLowPayload; createdAt: string }
  | { type: 'stock.updated'; payload: StockUpdatedPayload; createdAt: string }
  | { type: 'pricing.rules.updated'; payload: PricingRulesUpdatedPayload; createdAt: string }
  | { type: 'pricing.override.updated'; payload: PricingOverrideUpdatedPayload; createdAt: string }
  | { type: 'visitor.updated'; payload: VisitorUpdatedPayload; createdAt: string }
  | { type: 'health.ping'; payload: HealthPingPayload; createdAt: string }
  | { type: 'callback.requested'; payload: CallbackRequestedPayload; createdAt: string }
  | {
      type: 'booking.adjustment.created';
      payload: BookingAdjustmentCreatedPayload;
      createdAt: string;
    }
  | {
      type: 'booking.adjustment.paid';
      payload: BookingAdjustmentPaidPayload;
      createdAt: string;
    }
  | { type: 'lead.call.clicked'; payload: LeadCallClickedPayload; createdAt: string }
  | {
      type: 'payment.deposit.succeeded';
      payload: PaymentDepositSucceededPayload;
      createdAt: string;
    }
  | {
      type: 'payment.balance.succeeded';
      payload: PaymentBalanceSucceededPayload;
      createdAt: string;
    }
  | {
      type: 'emergency_assist.created';
      payload: EmergencyAssistCreatedPayload;
      createdAt: string;
    }
  | {
      type: 'emergency_assist.location_updated';
      payload: EmergencyAssistLocationUpdatedPayload;
      createdAt: string;
    }
  | {
      type: 'booking.checkout.started';
      payload: BookingCheckoutStartedPayload;
      createdAt: string;
    }
  | {
      type: 'admin.action_queue.pricing_review_upserted';
      payload: AdminActionQueuePricingReviewUpsertedPayload;
      createdAt: string;
    };

export type RealtimeEventType = RealtimeEvent['type'];
