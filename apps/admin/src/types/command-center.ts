export type ActionItemKind =
  | 'payment_failed'
  | 'deposit_balance_due'
  | 'callback_request'
  | 'pending_adjustment'
  | 'low_stock'
  | 'locking_nut_no_key'
  | 'high_priority_notification'
  | 'smart_recheck'
  | 'emergency_assist_started'
  | 'website_call_clicked'
  | 'booking_in_progress'
  | 'booking_abandoned'
  | 'pricing_review_required';

export type ActionItemSeverity = 'DANGER' | 'WARNING' | 'INFO';

export type ActionItemRecommendedAction =
  | 'CALL_CUSTOMER'
  | 'MONITOR_QUOTE'
  | 'OPEN_QUICK_BOOKING';

export type PricingRiskLevel =
  | 'NORMAL'
  | 'REVIEW'
  | 'HIGH_RISK'
  | 'BLOCK_PUBLIC_PAYMENT';

export type PricingRecommendedActionForReview =
  | 'CONTINUE'
  | 'TAKE_DEPOSIT'
  | 'REQUIRE_FULL_PAYMENT'
  | 'CALL_FIRST'
  | 'ADMIN_REVIEW'
  | 'SWITCH_TO_REPLACEMENT'
  | 'CREATE_AS_ASSESSMENT_FIRST';

export type PricingRecommendedPaymentMode =
  | 'CASH'
  | 'DEPOSIT'
  | 'FULL'
  | 'MANUAL_REVIEW';

export interface ActionItem {
  id: string;
  kind: ActionItemKind;
  severity: ActionItemSeverity;
  title: string;
  message: string;
  bookingId: string | null;
  trackingId: string | null;
  callbackRequestId: string | null;
  stockId: string | null;
  notificationId: string | null;
  amountGbp: string | null;
  source?: string | null;
  smartRecheckType?: string | null;
  emergencyAssistEventId?: string | null;
  callClickEventId?: string | null;
  sourcePage?: string | null;
  sourceComponent?: string | null;
  customerName?: string | null;
  tyreProblemType?: string | null;
  jobType?: string | null;
  phone?: string | null;
  vehicleRegistration?: string | null;
  recommendedAction?: ActionItemRecommendedAction | null;
  /** Set when kind === 'pricing_review_required'. */
  pricingRiskLevel?: PricingRiskLevel | null;
  pricingReasons?: string[] | null;
  pricingRecommendedAction?: PricingRecommendedActionForReview | null;
  pricingRecommendedPaymentMode?: PricingRecommendedPaymentMode | null;
  pricingDistanceMiles?: number | null;
  quoteId?: string | null;
  createdAt: string;
}

export interface ActionQueueResponse {
  items: ActionItem[];
  counts: { total: number; danger: number; warning: number; info: number };
}

export interface TodaySummary {
  date: string;
  bookingsToday: {
    total: number;
    newCount: number;
    confirmed: number;
    dispatched: number;
    onSite: number;
    completed: number;
    cancelled: number;
    /** Buy Tyres scheduled-fitting orders created today. */
    buyTyres?: number;
    /** Emergency / non tyre_shop bookings created today. */
    emergency?: number;
    /** Buy Tyres orders that successfully paid today. */
    buyTyresPaid?: number;
    /** Buy Tyres special-orders / backorders open today. */
    buyTyresBackorders?: number;
  };
  pending: {
    paymentFailed: number;
    depositBalanceDue: number;
    noLockingNutKey: number;
  };
  cashToday: {
    collectedTotalGbp: string;
    collectedFullGbp: string;
    collectedDepositsGbp: string;
    collectedBalanceGbp: string;
    collectedAdjustmentGbp: string;
    paymentsCount: number;
    failedPaymentsCount: number;
  };
  callbacks: { todayTotal: number; todayNew: number; openTotal: number };
  pendingAdjustments: number;
  emergencyAssist?: { todayTotal: number; todayOpen: number };
  pricingSafety?: {
    reviewToday: number;
    highRiskToday: number;
    callFirstBlocksToday: number;
    longDistanceAssessmentsToday: number;
    cashHighRiskToday: number;
    overridesToday: number;
    belowMinimumOverridesToday: number;
  };
  nextBestAction?: import('./admin-efficiency').NextBestAction | null;
}

export interface MapboxLocationResponse {
  bookingId: string;
  hasLocation: boolean;
  addressLabel: string | null;
  coordinates: { lat: number; lng: number } | null;
  locationConfidence:
    | 'CONFIRMED_ADDRESS'
    | 'GPS_ONLY'
    | 'WEAK_ADDRESS'
    | 'MISSING_LOCATION';
  mapPreviewUrl: string | null;
  externalNavigationOptions: {
    appleMapsUrl: string | null;
    genericGeoUrl: string | null;
    mapboxDirectionsUrl: string | null;
  };
  warningMessage: string | null;
}
