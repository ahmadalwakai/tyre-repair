import type { AdminPaymentRiskSummary, BookingPaymentSummary } from './payments';

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
  | 'refunded';

export type LockingWheelNutStatus = 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY';

export type FittingMethod = 'GARAGE' | 'HOME';

export type CheckoutPaymentMode = 'FULL' | 'DEPOSIT';

export type QuoteJobType = 'ASSESSMENT' | 'REPLACEMENT';

export type TyreProblemType =
  | 'PUNCTURE_OR_FLAT'
  | 'DAMAGED_OR_BLOWN_OUT'
  | 'SLOW_PRESSURE_LOSS'
  | 'NEEDS_REPLACEMENT'
  | 'NOT_SURE';

export interface BookingListItem {
  bookingId: string;
  trackingId: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  customer: { name: string | null; phone: string | null; email: string | null };
  tyre: { brand: string; model: string; sizeLabel: string } | null;
  backupTyre: { brand: string; model: string; sizeLabel: string } | null;
  location: { addressLine1: string | null; city: string | null; postcode: string | null } | null;
  totalPriceGbp: string | null;
  /** Item 12 — added so the bookings list can show outstanding balance inline. */
  balanceDueGbp?: string | null;
  /** Item 12 — added so the bookings list can show deposit amount inline. */
  depositAmountGbp?: string | null;
  lockingWheelNutStatus: LockingWheelNutStatus;
  jobType: QuoteJobType;
  tyreProblemType: TyreProblemType | null;
  assessmentFeeGbp: string | null;
  /* Buy Tyres scheduled-fitting fields (null/undefined for emergency rows). */
  source?: string | null;
  fittingMethod?: FittingMethod | null;
  quantity?: number | null;
  scheduledAt?: string | null;
  slotLabel?: string | null;
  isBackorder?: boolean | null;
  backorderEtaDays?: number | null;
  fittingFeeGbp?: string | null;
  distanceFeeGbp?: string | null;
  checkoutPaymentMode?: CheckoutPaymentMode | null;
  stockDecrementedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingListResponse {
  /** Legacy cursor pagination — present when no `page` query param is supplied. */
  items?: BookingListItem[];
  nextCursor?: string | null;
  /** Item 12 — paginated response when `page`/`pageSize` query params are supplied. */
  data?: BookingListItem[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export interface BookingEvent {
  fromStatus: string | null;
  toStatus: string;
  message: string | null;
  createdAt: string;
}

export interface BookingDetail {
  booking: {
    bookingId: string;
    trackingId: string;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    adminNotes: string | null;
    customerNotes: string | null;
    createdAt: string;
    confirmedAt: string | null;
    dispatchedAt: string | null;
    onSiteAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    refundedAt: string | null;
    lockingWheelNutStatus: LockingWheelNutStatus;
    jobType: QuoteJobType;
    tyreProblemType: TyreProblemType | null;
    assessmentFeeGbp: string | null;
    source?: string | null;
    /* Buy Tyres scheduled-fitting fields (null for emergency bookings). */
    fittingMethod?: FittingMethod | null;
    quantity?: number | null;
    scheduledAt?: string | null;
    slotLabel?: string | null;
    isBackorder?: boolean | null;
    backorderEtaDays?: number | null;
    fittingFeeGbp?: string | null;
    distanceFeeGbp?: string | null;
    checkoutPaymentMode?: CheckoutPaymentMode | null;
    stockDecrementedAt?: string | null;
  };
  customer: { name: string | null; phone: string | null; email: string | null };
  location: {
    addressLine1: string | null;
    city: string | null;
    postcode: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  tyre: {
    tyreId: string;
    brand: string;
    model: string;
    sizeLabel: string;
    sku: string;
    basePriceGbp?: string | null;
    stock?: {
      quantityAvailable: number;
      reservedQuantity: number;
      lowStockThreshold: number;
    } | null;
  } | null;
  backupTyre: { tyreId: string; brand: string; model: string; sizeLabel: string } | null;
  quote: {
    quoteId: string;
    basePriceGbp: string;
    /** Legacy field — always '0.00' (business is not VAT registered). */
    vatAmountGbp: string;
    totalPriceGbp: string;
  } | null;
  payment: {
    paymentId: string;
    amountGbp: string;
    status: string;
    paidAt: string | null;
  } | null;
  events: BookingEvent[];
}

/* ---------- Item 6 — extended booking detail sections ---------- */

export interface BookingTimelineEntry {
  type: 'status_change';
  fromStatus: string | null;
  toStatus: string;
  message: string | null;
  createdAt: string;
}

export interface BookingAdjustment {
  id: string;
  type: string;
  status: string;
  originalPaidAmountGbp: string | null;
  additionalAmountGbp: string | null;
  totalReplacementAmountGbp: string | null;
  paidAt: string | null;
  createdAt: string;
  notes: string | null;
}

export interface BookingCancellation {
  id: string;
  reason: string | null;
  stage: string | null;
  depositDecision: string | null;
  retainedAmountGbp: string | null;
  refundDueGbp: string | null;
  balanceDueGbp: string | null;
  customerMessage: string | null;
  internalNotes: string | null;
  createdAt: string;
}

export interface BookingContactHistoryEntry {
  id: string;
  action: string;
  actorLabel: string | null;
  actorType: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface BookingSafetySummary {
  lockingWheelNutStatus: LockingWheelNutStatus;
  lockingNutWarning: string | null;
  hasGpsLocation: boolean;
  hasAddress: boolean;
  notesPresent: boolean;
}

export interface BookingDetailExtended extends BookingDetail {
  paymentSummary: BookingPaymentSummary | null;
  paymentRisk: AdminPaymentRiskSummary | null;
  safetySummary: BookingSafetySummary;
  timeline: BookingTimelineEntry[];
  adjustments: BookingAdjustment[];
  cancellation: BookingCancellation | null;
  contactHistory: BookingContactHistoryEntry[];
  healthScore?: BookingHealthScoreSummary;
}

/* ---------- Admin Efficiency Pack F2 — Booking health score ---------- */
export type BookingHealthSeverity = 'GOOD' | 'INFO' | 'WARNING' | 'DANGER';
export interface BookingHealthScoreSummary {
  status: 'EXCELLENT' | 'OK' | 'NEEDS_ATTENTION' | 'AT_RISK';
  severity: BookingHealthSeverity;
  score: number;
  title: string;
  message: string;
  missingItems: string[];
  recommendedActions: string[];
}

export interface CreateBookingInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehicleRegistration?: string;
  tyreId?: string;
  manualTyreSize?: string;
  addressText?: string;
  notes?: string;
  confirmNow?: boolean;
}
