/**
 * API clients for the Quick Booking wizard backend endpoints.
 */
import { apiGet, apiPost } from './client';

export type LocationConfidence =
  | 'CONFIRMED_ADDRESS'
  | 'GPS_ONLY'
  | 'WEAK_ADDRESS'
  | 'MISSING_LOCATION';

export type TrafficLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN';

export interface RouteIntelligenceRequest {
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
}

export interface RouteIntelligenceResponse {
  latitude: number | null;
  longitude: number | null;
  resolvedAddress: string | null;
  resolvedPostcode: string | null;
  locationConfidence: LocationConfidence;
  distanceMiles: number | null;
  durationMinutes: number | null;
  trafficLabel: TrafficLevel;
  externalNavigationUrl: string | null;
  warnings: string[];
}

export function fetchRouteIntelligence(
  body: RouteIntelligenceRequest,
): Promise<RouteIntelligenceResponse> {
  return apiPost<RouteIntelligenceResponse>(
    '/api/admin/quick-booking/route-intelligence',
    body,
  );
}

export interface CustomerLookupResponse {
  found: boolean;
  customer: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string;
    createdAt: string;
    bookingsCount: number;
  } | null;
  lastBooking: {
    id: string;
    trackingId: string;
    status: string;
    paymentStatus: string;
    jobType: string;
    createdAt: string;
  } | null;
  riskNotes: Array<{
    id: string;
    noteType: string;
    body: string;
    createdAt: string;
  }>;
}

export function lookupCustomerByPhone(phone: string): Promise<CustomerLookupResponse> {
  const qs = new URLSearchParams({ phone });
  return apiGet<CustomerLookupResponse>(`/api/admin/customers/lookup-by-phone?${qs.toString()}`);
}

export interface QuickPriceQuoteRequest {
  jobType: 'ASSESSMENT' | 'REPLACEMENT';
  tyreId?: string;
  tyreProblemType?:
    | 'PUNCTURE_OR_FLAT'
    | 'DAMAGED_OR_BLOWN_OUT'
    | 'SLOW_PRESSURE_LOSS'
    | 'NEEDS_REPLACEMENT'
    | 'NOT_SURE';
  manualLocation?: {
    addressLine1: string;
    city?: string;
    postcode: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface QuickPriceQuoteResponse {
  jobType: 'ASSESSMENT' | 'REPLACEMENT';
  assessmentFeeGbp: string | null;
  pricing: {
    basePriceGbp: string;
    multipliedTyrePriceGbp: string;
    distanceFeeGbp: string;
    preVatSubtotalGbp: string;
    vatRate: number;
    vatAmountGbp: string;
    totalPriceGbp: string;
    breakdown: {
      notes?: string[];
      [key: string]: unknown;
    };
  };
  availability: 'in_stock' | 'low_stock' | 'special_order' | null;
  calculatedAt: string;
  expiresAt: string;
  tyre: {
    id: string;
    brand: string;
    model: string;
    sizeLabel: string;
  } | null;
  pricingSafety: PricingSafetyClient;
  pricingFactorsActive: {
    distance: boolean;
    timeOfDay: boolean;
    lateNight: boolean;
    weekend: boolean;
    bankHoliday: boolean;
    weather: boolean;
    demand: boolean;
    traffic: boolean;
    adminOverride: boolean;
  };
  /** Engine-calculated total before any learned admin adjustment. */
  engineTotalPriceGbp?: string;
  /** Same as `pricing.totalPriceGbp` — the suggested figure after learning. */
  suggestedTotalPriceGbp?: string;
  /** Present when ≥3 recent admin overrides exist for this scenario. */
  learnedAdjustment?: {
    multiplier: number;
    sampleSize: number;
    windowDays: number;
  } | null;
}

export type PricingRiskLevelClient =
  | 'NORMAL'
  | 'REVIEW'
  | 'HIGH_RISK'
  | 'BLOCK_PUBLIC_PAYMENT';

export type PricingRecommendedActionClient =
  | 'CONTINUE'
  | 'TAKE_DEPOSIT'
  | 'REQUIRE_FULL_PAYMENT'
  | 'CALL_FIRST'
  | 'ADMIN_REVIEW'
  | 'SWITCH_TO_REPLACEMENT'
  | 'CREATE_AS_ASSESSMENT_FIRST';

export type PricingRecommendedPaymentModeClient =
  | 'CASH'
  | 'DEPOSIT'
  | 'FULL'
  | 'MANUAL_REVIEW';

export interface PricingSafetyClient {
  level: PricingRiskLevelClient;
  title: string;
  message: string;
  reasons: string[];
  adminReasons: string[];
  customerSafeMessage?: string;
  recommendedAction: PricingRecommendedActionClient;
  recommendedPaymentMode: PricingRecommendedPaymentModeClient;
  minimumRecommendedTotalGbp?: string;
  publicPaymentAllowed: boolean;
  adminCanOverride: boolean;
  overrideRequiresReason: boolean;
  /** Surface the verdict was computed for. */
  pricingChannel?: 'PUBLIC_SELF_BOOKING' | 'ADMIN_PHONE_BOOKING';
  /** Admin Quick Booking can create the booking. */
  adminCanProceed?: boolean;
  /** Admin must tick a confirmation before creating. */
  adminRequiresConfirmation?: boolean;
  /** Confirmations the admin must tick when public would have been blocked. */
  adminRequiredConfirmations?: string[];
  /** Suggested next steps (guidance, not gating). */
  adminRecommendedNextSteps?: string[];
}

export function fetchQuickPriceQuote(
  body: QuickPriceQuoteRequest,
): Promise<QuickPriceQuoteResponse> {
  return apiPost<QuickPriceQuoteResponse>('/api/admin/quick-booking/price-quote', body);
}

/* ---------------- Pre-booking location request ---------------- */

export type LocationRequestChannel = 'SMS' | 'EMAIL' | 'WHATSAPP_LINK' | 'COPY_LINK';

export interface RequestLocationInput {
  channel: LocationRequestChannel;
  phone?: string;
  email?: string;
  customerName?: string;
}

export interface RequestLocationResponse {
  success: true;
  channel: LocationRequestChannel;
  /** External URL to open (only for WHATSAPP_LINK) or raw link (COPY_LINK). */
  externalUrl?: string;
  /** Secure capture token — pass to fetchQuickBookingLocationStatus to poll. */
  token: string;
  /** Whether the server actually delivered a message. */
  sent: boolean;
  skippedReason?: 'missing_credentials' | 'send_failed' | 'no_phone' | 'no_email';
  expiresInMinutes: number;
}

export function requestQuickBookingLocation(
  body: RequestLocationInput,
): Promise<RequestLocationResponse> {
  return apiPost<RequestLocationResponse>(
    '/api/admin/quick-booking/request-location',
    body,
  );
}

export interface LocationStatusResponse {
  status: 'pending' | 'received' | 'expired' | 'invalid';
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number | null;
  receivedAt?: string;
}

export function fetchQuickBookingLocationStatus(
  token: string,
): Promise<LocationStatusResponse> {
  const qs = new URLSearchParams({ token });
  return apiGet<LocationStatusResponse>(
    `/api/admin/quick-booking/location-status?${qs.toString()}`,
  );
}
