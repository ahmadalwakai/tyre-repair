import type {
  PricingOverrideStatus,
  PricingOverrideType,
} from '@tyrerepair/realtime';
import type { TyreAvailability, TyreTier, TyreType } from '@/types/quote';

export type MoneyGbp = string;

export type PricingRuleKey =
  | 'time_night'
  | 'time_peak_morning'
  | 'weather_moderate'
  | 'weather_severe'
  | 'date_weekend'
  | 'date_bank_holiday'
  | 'distance_free_miles'
  | 'distance_per_mile_gbp'
  | 'demand_open_jobs_threshold'
  | 'demand_high_multiplier'
  | 'vat_rate'
  | 'emergency_assessment_fee_gbp';

export type TyreProblemType =
  | 'PUNCTURE_OR_FLAT'
  | 'DAMAGED_OR_BLOWN_OUT'
  | 'SLOW_PRESSURE_LOSS'
  | 'NEEDS_REPLACEMENT'
  | 'NOT_SURE';

export type QuoteJobType = 'ASSESSMENT' | 'REPLACEMENT';

export interface PricingRuleRecord {
  key: PricingRuleKey;
  label: string;
  numericValue: number;
  isMultiplier: boolean;
  isActive: boolean;
}

export type PricingRuleMap = Map<PricingRuleKey, PricingRuleRecord>;

export interface PricingFactor {
  multiplier: number;
  reason: string;
}

export type WeatherSeverity = 'none' | 'moderate' | 'severe' | 'unknown' | 'unavailable';

export interface WeatherPricingInput {
  latitude: number | null;
  longitude: number | null;
}

export interface WeatherPricingFactor extends PricingFactor {
  severity: WeatherSeverity;
  weatherCode: number | null;
  temperatureCelsius: number | null;
  windSpeedMph: number | null;
  precipitationMm: number | null;
}

export interface DatePricingFactor extends PricingFactor {
  isWeekend: boolean;
  isBankHoliday: boolean;
  bankHolidayName: string | null;
}

export type TimeBand = 'night' | 'peak_morning' | 'standard';

export interface TimePricingFactor extends PricingFactor {
  band: TimeBand;
  hourLondon: number;
}

export interface DistancePricingFactor {
  distanceMiles: number | null;
  freeMiles: number;
  perMileGbp: number;
  feeGbp: MoneyGbp;
  reason: string;
}

export interface DemandPricingFactor extends PricingFactor {
  openJobs: number | null;
  threshold: number;
}

export interface OverrideAppliedItem {
  overrideId: string;
  type: PricingOverrideType;
  status: PricingOverrideStatus;
  label: string;
  multiplier: number;
  reason: string | null;
}

export interface OverridePricingFactor extends PricingFactor {
  activeOverrides: OverrideAppliedItem[];
}

export interface AppliedMultiplier {
  key: 'time' | 'weather' | 'date' | 'demand' | 'override';
  label: string;
  multiplier: number;
}

export interface PricingBreakdown {
  time: TimePricingFactor;
  weather: WeatherPricingFactor;
  date: DatePricingFactor;
  distance: DistancePricingFactor;
  demand: DemandPricingFactor;
  overrides: OverridePricingFactor;
  appliedMultipliers: AppliedMultiplier[];
  notes: string[];
}

export interface TyrePricingSnapshot {
  tyreId: string;
  sku: string;
  brand: string;
  model: string;
  sizeLabel: string;
  width: number;
  profile: number;
  rim: number;
  speedRating: string;
  loadIndex: string;
  tier: TyreTier;
  type: TyreType;
  basePriceGbp: MoneyGbp;
}

export interface StockPricingSnapshot {
  quantityAvailable: number;
  lowStockThreshold: number;
}

export interface ManualLocationInput {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface DynamicQuoteInput {
  /** Required when jobType === 'REPLACEMENT'. Omit for emergency assessment. */
  tyreId?: string;
  /**
   * Job type: REPLACEMENT (default) prices a specific tyre. ASSESSMENT prices a flat
   * emergency callout fee so the customer is not forced to pre-pay for a tyre before we
   * know if it can be repaired.
   */
  jobType?: QuoteJobType;
  tyreProblemType?: TyreProblemType;
  /** Optional backup tyre to note when booking an assessment. */
  backupTyreId?: string;
  locationId?: string;
  manualLocation?: ManualLocationInput;
  /** For internal/test use only — never accepted from public API. */
  quoteTime?: Date;
  /**
   * Which surface is asking for this quote. Drives:
   *  - admin-friendly vs customer-safe messaging
   *  - whether `adminCanProceed` requires explicit confirmation
   *  - audit metadata
   * Default: 'PUBLIC_SELF_BOOKING' (treated as the strict path).
   */
  pricingChannel?: PricingChannel;
}

/**
 * Pricing surface. Public is strict (online payment may be blocked, only
 * customer-safe messages exposed). Admin is flexible (red warnings shown
 * but the admin can confirm and continue, with audit trail).
 */
export type PricingChannel = 'PUBLIC_SELF_BOOKING' | 'ADMIN_PHONE_BOOKING';

export interface DynamicPricing {
  basePriceGbp: MoneyGbp;
  multipliedTyrePriceGbp: MoneyGbp;
  distanceFeeGbp: MoneyGbp;
  /**
   * Subtotal before VAT. Since the business is not VAT registered, this equals
   * `totalPriceGbp` and `vatAmountGbp` is always '0.00'. Field retained for back-compat.
   */
  preVatSubtotalGbp: MoneyGbp;
  /** Always 0 — business is not VAT registered. */
  vatRate: number;
  /** Always '0.00' — business is not VAT registered. */
  vatAmountGbp: MoneyGbp;
  totalPriceGbp: MoneyGbp;
  currency: 'GBP';
  breakdown: PricingBreakdown;
}

export interface DynamicQuoteResult {
  /** Null when jobType === 'ASSESSMENT' (no specific tyre quoted). */
  tyre: TyrePricingSnapshot | null;
  /** Null when jobType === 'ASSESSMENT'. */
  stock: StockPricingSnapshot | null;
  jobType: QuoteJobType;
  tyreProblemType: TyreProblemType | null;
  /** When jobType === 'ASSESSMENT', the assessment fee in GBP. Null otherwise. */
  assessmentFeeGbp: MoneyGbp | null;
  pricing: DynamicPricing;
  availability: TyreAvailability;
  calculatedAt: string;
  expiresAt: string;
  resolvedLocation: {
    locationId: string | null;
    latitude: number | null;
    longitude: number | null;
    addressLine1: string | null;
    city: string | null;
    postcode: string | null;
  } | null;
  /** Profit / risk guard summary — see profit-guard.ts. */
  pricingSafety: PricingSafetyResult;
  /** Which pricing factors actually contributed real (non-1.0) data to this quote. */
  pricingFactorsActive: PricingFactorsActive;
}

/* ---------------- Pricing Safety / Profit Guard ---------------- */

export type PricingRiskLevel =
  | 'NORMAL'
  | 'REVIEW'
  | 'HIGH_RISK'
  | 'BLOCK_PUBLIC_PAYMENT';

export type PricingRiskReason =
  | 'LONG_DISTANCE'
  | 'VERY_LONG_DISTANCE'
  | 'LONG_DISTANCE_ASSESSMENT'
  | 'ASSESSMENT_MAY_BE_LOSS_MAKING'
  | 'CASH_ON_SITE_RISK'
  | 'GPS_ONLY_LOCATION'
  | 'WEAK_LOCATION'
  | 'HIGH_TRAFFIC'
  | 'LATE_NIGHT'
  | 'WEEKEND'
  | 'BANK_HOLIDAY'
  | 'BAD_WEATHER'
  | 'HIGH_DEMAND'
  | 'LOCKING_NUT_NO_KEY'
  | 'LOCKING_NUT_UNKNOWN'
  | 'OUTSIDE_NORMAL_COVERAGE'
  | 'BELOW_RECOMMENDED_MINIMUM'
  | 'MANUAL_REVIEW_REQUIRED';

export type PricingRecommendedAction =
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

export interface PricingSafetyResult {
  level: PricingRiskLevel;
  title: string;
  /** Admin-facing summary message. May contain direct internal language. */
  message: string;
  reasons: PricingRiskReason[];
  /** Bullet list of admin-facing reason strings. */
  adminReasons: string[];
  /**
   * Optional public-safe message. Never contains words like "loss-making",
   * "profit", "high risk", "admin review". Safe to show to customers.
   */
  customerSafeMessage?: string;
  recommendedAction: PricingRecommendedAction;
  recommendedPaymentMode: PricingRecommendedPaymentMode;
  /** Below this admin must override with reason if they accept a lower price. */
  minimumRecommendedTotalGbp?: MoneyGbp;
  /** True when the public site may complete an online payment automatically. */
  publicPaymentAllowed: boolean;
  /** True when an admin (in Quick Booking) can override and continue. */
  adminCanOverride: boolean;
  /** True when an override below the recommended minimum requires a reason. */
  overrideRequiresReason: boolean;
  /**
   * Which surface this verdict was computed for. Echoed back so callers /
   * audit logs can record the channel without re-passing it.
   */
  pricingChannel: PricingChannel;
  /**
   * True when the admin Quick Booking flow can create the booking. Distinct
   * from `publicPaymentAllowed`: many jobs that block public payment can
   * still be created by an admin after manual confirmation.
   */
  adminCanProceed: boolean;
  /** True when the admin must tick a confirmation before creating the booking. */
  adminRequiresConfirmation: boolean;
  /**
   * Short, action-oriented confirmation prompts the admin must agree to before
   * creating a booking that public would have blocked. Empty for normal jobs.
   * Examples: "Confirm location with the customer.", "Take 15% deposit on card."
   */
  adminRequiredConfirmations: string[];
  /**
   * Short next-step suggestions for the admin (in priority order). Distinct
   * from confirmations: these are guidance only, not gating.
   */
  adminRecommendedNextSteps: string[];
}

export interface PricingFactorsActive {
  distance: boolean;
  timeOfDay: boolean;
  lateNight: boolean;
  weekend: boolean;
  bankHoliday: boolean;
  weather: boolean;
  demand: boolean;
  traffic: boolean;
  adminOverride: boolean;
}

export type PricingEngineErrorCode =
  | 'tyre_not_found'
  | 'tyre_inactive'
  | 'invalid_location'
  | 'db_error';

export class PricingEngineError extends Error {
  public readonly code: PricingEngineErrorCode;
  public readonly status: number;

  public constructor(code: PricingEngineErrorCode, message: string) {
    super(message);
    this.name = 'PricingEngineError';
    this.code = code;
    this.status =
      code === 'tyre_not_found' || code === 'tyre_inactive'
        ? 404
        : code === 'invalid_location'
          ? 400
          : 500;
  }
}
