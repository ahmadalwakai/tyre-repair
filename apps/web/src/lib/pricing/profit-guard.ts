/**
 * Profit guard / pricing safety calculator.
 *
 * Pure synchronous function. Given a finalised dynamic quote plus optional
 * route + location + payment context, returns a `PricingSafetyResult` that
 * downstream code uses to:
 *
 *   1. Block public online payment for risky jobs (long-distance assessment,
 *      no locking-nut key, GPS-only weak location far from base, etc.).
 *   2. Render a green/amber/red signal to the admin in Quick Booking.
 *   3. Recommend a payment mode (cash / deposit / full) per scenario.
 *   4. Require a reason when the admin overrides below a minimum total.
 *
 * Customer-facing messages NEVER contain internal words like "loss-making",
 * "profit", or "admin review". Public copy is friendly and call-first.
 */
import type { PricingChannel, PricingRuleMap } from './types';
import type {
  PricingRecommendedAction,
  PricingRecommendedPaymentMode,
  PricingRiskLevel,
  PricingRiskReason,
  PricingSafetyResult,
  QuoteJobType,
  TyreProblemType,
} from './types';
import { getPricingRuleNumber } from './rules';
import {
  getPricingThresholds,
  PRICING_THRESHOLD_DEFAULTS,
  type PricingThresholds,
} from '@/lib/settings/pricing-settings';

export type LocationConfidence =
  | 'CONFIRMED_ADDRESS'
  | 'GPS_ONLY'
  | 'WEAK_ADDRESS'
  | 'MISSING_LOCATION';

export type TrafficLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN';

export type LockingWheelNutStatus =
  | 'HAVE_KEY'
  | 'NO_KEY'
  | 'STANDARD_ONLY'
  | 'UNSURE';

export type ProposedPaymentMode = 'CASH' | 'DEPOSIT' | 'FULL';

export interface PricingSafetyInput {
  jobType: QuoteJobType;
  tyreProblemType?: TyreProblemType | null;
  /** Mapbox-driving or haversine miles. Null when location not yet known. */
  distanceMiles: number | null;
  routeDurationMinutes?: number | null;
  trafficLevel?: TrafficLevel;
  locationConfidence?: LocationConfidence;
  paymentMode?: ProposedPaymentMode;
  lockingWheelNutStatus?: LockingWheelNutStatus;
  /** Final quote total in GBP (numeric string). */
  finalTotalGbp: string;
  /** Pure base assessment fee from the engine. */
  baseAssessmentFeeGbp?: string | null;
  /** Selected tyre price (replacement only). */
  selectedTyrePriceGbp?: string | null;
  /** Server-side current Date (defaults to new Date()). */
  now?: Date;
  /** Optional context flags from upstream. */
  isWeekend?: boolean;
  isBankHoliday?: boolean;
  isLateNight?: boolean;
  isHighDemand?: boolean;
  weatherSeverity?: 'none' | 'moderate' | 'severe' | 'unknown' | 'unavailable';
  /** Optional pricing rules (DB) — used for tunable thresholds. */
  rules?: PricingRuleMap;
  /**
   * Which surface is asking. Default 'PUBLIC_SELF_BOOKING' (strict).
   * Admin gets the same risk verdict, but messaging + adminCanProceed are
   * tuned so admins are never told to "call first" (they are already on the
   * call) and HIGH_RISK / BLOCK_PUBLIC_PAYMENT do not silently stop them.
   */
  pricingChannel?: PricingChannel;
}

/* ---------------- Defaults ---------------- */

/**
 * Compiled-in defaults for the additional knobs that are NOT yet exposed
 * via app_settings (drive-time and cash-distance heuristics). The distance
 * thresholds and assessment minimum are now sourced from
 * app_settings.pricing via {@link getPricingThresholds} and merged with
 * {@link PRICING_THRESHOLD_DEFAULTS} so a missing settings row is safe.
 */
const LOCAL_DEFAULTS = {
  /** Drive-time minutes considered very long. */
  highDriveMinutes: 75,
  /** Cash on site is discouraged from this distance up. */
  cashLongDistanceWarningMiles: 18,
} as const;

interface ResolvedThresholds {
  reviewDistanceMiles: number;
  highRiskDistanceMiles: number;
  maxAutoQuoteDistanceMiles: number;
  longDistanceAssessmentThresholdMiles: number;
  veryLongDistanceAssessmentThresholdMiles: number;
  longDistanceAssessmentMinimumGbp: number;
  highDriveMinutes: number;
  cashLongDistanceWarningMiles: number;
}

function resolveThresholds(
  pricing: PricingThresholds,
  rules?: PricingRuleMap,
): ResolvedThresholds {
  // pricing_rules enum is fixed (see schema), so we only read the keys that
  // are guaranteed to exist via getPricingRuleNumber's safe default fallback.
  // Custom thunks would require a schema extension; we intentionally avoid
  // that here and use safe in-code defaults.
  void rules;
  return {
    reviewDistanceMiles: pricing.review_distance_miles,
    highRiskDistanceMiles: pricing.high_risk_distance_miles,
    maxAutoQuoteDistanceMiles: pricing.max_auto_quote_distance_miles,
    longDistanceAssessmentThresholdMiles:
      pricing.long_distance_assessment_threshold_miles,
    veryLongDistanceAssessmentThresholdMiles:
      pricing.very_long_distance_assessment_threshold_miles,
    longDistanceAssessmentMinimumGbp: pricing.long_distance_assessment_min_gbp,
    highDriveMinutes: LOCAL_DEFAULTS.highDriveMinutes,
    cashLongDistanceWarningMiles: LOCAL_DEFAULTS.cashLongDistanceWarningMiles,
  };
}

/* ---------------- Main ---------------- */

/**
 * Pure profit-guard evaluation against an explicit thresholds document.
 *
 * This is the synchronous core. Use {@link calculatePricingSafety} for the
 * async entry point that fetches thresholds from app_settings.
 */
export function evaluateProfitGuard(
  input: PricingSafetyInput,
  thresholds: PricingThresholds,
): PricingSafetyResult {
  const T = resolveThresholds(thresholds, input.rules);
  const reasons: PricingRiskReason[] = [];
  const adminReasons: string[] = [];

  const distance = input.distanceMiles;
  const total = parseFloat(input.finalTotalGbp);
  const totalNum = Number.isFinite(total) ? total : 0;
  const isAssessment = input.jobType === 'ASSESSMENT';

  // Holder object so TypeScript does not narrow the literal type across
  // closure mutations performed by `bumpLevel`.
  const state: { level: PricingRiskLevel } = { level: 'NORMAL' };
  let recommendedAction: PricingRecommendedAction = 'CONTINUE';
  let recommendedPaymentMode: PricingRecommendedPaymentMode = isAssessment ? 'FULL' : 'FULL';
  let minimumRecommendedTotalGbp: string | undefined;
  let publicPaymentAllowed = true;
  const adminCanOverride = true;
  let overrideRequiresReason = false;

  /** Bump level only upwards. */
  const bumpLevel = (next: PricingRiskLevel): void => {
    const order: Record<PricingRiskLevel, number> = {
      NORMAL: 0,
      REVIEW: 1,
      HIGH_RISK: 2,
      BLOCK_PUBLIC_PAYMENT: 3,
    };
    if (order[next] > order[state.level]) state.level = next;
  };

  /* --- Location / GPS --- */
  const conf = input.locationConfidence;
  if (conf === 'GPS_ONLY') {
    reasons.push('GPS_ONLY_LOCATION');
    adminReasons.push('GPS-only location — confirm exact spot with the customer.');
    bumpLevel('REVIEW');
  }
  if (conf === 'WEAK_ADDRESS') {
    reasons.push('WEAK_LOCATION');
    adminReasons.push('Weak address match — confirm the postcode and street.');
    bumpLevel('REVIEW');
  }

  /* --- Distance --- */
  if (distance != null) {
    if (distance > T.maxAutoQuoteDistanceMiles) {
      reasons.push('OUTSIDE_NORMAL_COVERAGE');
      adminReasons.push(
        `Outside normal coverage (~${distance.toFixed(0)} mi from base). Confirm we can dispatch.`,
      );
      bumpLevel('HIGH_RISK');
      recommendedAction = 'CALL_FIRST';
    } else if (distance >= T.highRiskDistanceMiles) {
      reasons.push('VERY_LONG_DISTANCE');
      adminReasons.push(
        `Very long distance (${distance.toFixed(1)} mi). Take deposit or full payment.`,
      );
      bumpLevel('HIGH_RISK');
    } else if (distance >= T.reviewDistanceMiles) {
      reasons.push('LONG_DISTANCE');
      adminReasons.push(`Long distance (${distance.toFixed(1)} mi). Review before dispatch.`);
      bumpLevel('REVIEW');
    }

    /* --- Long-distance assessment protection --- */
    if (isAssessment && distance >= T.longDistanceAssessmentThresholdMiles) {
      reasons.push('LONG_DISTANCE_ASSESSMENT');
      adminReasons.push(
        'Long-distance assessment may not cover travel — consider full payment or convert to replacement.',
      );
      bumpLevel('REVIEW');

      if (totalNum < T.longDistanceAssessmentMinimumGbp) {
        reasons.push('ASSESSMENT_MAY_BE_LOSS_MAKING');
        reasons.push('BELOW_RECOMMENDED_MINIMUM');
        adminReasons.push(
          `Assessment total £${totalNum.toFixed(2)} is below the recommended £${T.longDistanceAssessmentMinimumGbp.toFixed(2)} for this distance.`,
        );
        minimumRecommendedTotalGbp = T.longDistanceAssessmentMinimumGbp.toFixed(2);
        bumpLevel('HIGH_RISK');
        overrideRequiresReason = true;
      }

      if (distance >= T.veryLongDistanceAssessmentThresholdMiles) {
        reasons.push('VERY_LONG_DISTANCE');
        adminReasons.push(
          `Very long-distance assessment (${distance.toFixed(0)} mi). Public should call first.`,
        );
        bumpLevel('BLOCK_PUBLIC_PAYMENT');
      }
    }
  }

  /* --- Drive time / traffic --- */
  if (input.routeDurationMinutes != null && input.routeDurationMinutes >= T.highDriveMinutes) {
    reasons.push('HIGH_TRAFFIC');
    adminReasons.push(
      `Drive time ~${Math.round(input.routeDurationMinutes)} min — schedule carefully.`,
    );
    bumpLevel('REVIEW');
  }
  if (input.trafficLevel === 'HIGH') {
    if (!reasons.includes('HIGH_TRAFFIC')) reasons.push('HIGH_TRAFFIC');
    adminReasons.push('Heavy traffic right now.');
    bumpLevel('REVIEW');
  }

  /* --- Locking wheel nut --- */
  if (input.lockingWheelNutStatus === 'NO_KEY') {
    reasons.push('LOCKING_NUT_NO_KEY');
    adminReasons.push('Locking wheel nut key missing — do not take online payment.');
    bumpLevel('BLOCK_PUBLIC_PAYMENT');
    recommendedAction = 'CALL_FIRST';
  } else if (input.lockingWheelNutStatus === 'UNSURE') {
    reasons.push('LOCKING_NUT_UNKNOWN');
    adminReasons.push('Locking wheel nut status unknown — confirm before dispatch.');
    bumpLevel('REVIEW');
  }

  /* --- Payment-mode-aware risk --- */
  if (
    input.paymentMode === 'CASH' &&
    distance != null &&
    distance >= T.cashLongDistanceWarningMiles
  ) {
    reasons.push('CASH_ON_SITE_RISK');
    adminReasons.push('Cash on site is risky for this distance — prefer deposit or full.');
    bumpLevel('REVIEW');
  }

  /* --- Time / weather / demand context (informational) --- */
  if (input.isLateNight) {
    reasons.push('LATE_NIGHT');
    adminReasons.push('Late-night emergency factor active.');
  }
  if (input.isWeekend) {
    reasons.push('WEEKEND');
    adminReasons.push('Weekend emergency factor active.');
  }
  if (input.isBankHoliday) {
    reasons.push('BANK_HOLIDAY');
    adminReasons.push('Bank holiday factor active.');
  }
  if (input.weatherSeverity === 'severe') {
    reasons.push('BAD_WEATHER');
    adminReasons.push('Severe weather — drive with extra care.');
    bumpLevel('REVIEW');
  }
  if (input.isHighDemand) {
    reasons.push('HIGH_DEMAND');
    adminReasons.push('High live-demand right now.');
  }

  /* --- Recommended payment mode --- */
  if (state.level === 'NORMAL') {
    recommendedPaymentMode = isAssessment ? 'FULL' : 'FULL';
  } else if (state.level === 'REVIEW') {
    recommendedPaymentMode = isAssessment ? 'FULL' : 'DEPOSIT';
    if (recommendedAction === 'CONTINUE') recommendedAction = 'TAKE_DEPOSIT';
  } else if (state.level === 'HIGH_RISK') {
    recommendedPaymentMode = 'FULL';
    if (recommendedAction === 'CONTINUE') recommendedAction = 'REQUIRE_FULL_PAYMENT';
    if (
      isAssessment &&
      distance != null &&
      distance >= T.veryLongDistanceAssessmentThresholdMiles
    ) {
      recommendedAction = 'SWITCH_TO_REPLACEMENT';
    }
  } else if (state.level === 'BLOCK_PUBLIC_PAYMENT') {
    recommendedPaymentMode = 'MANUAL_REVIEW';
    recommendedAction = 'CALL_FIRST';
    publicPaymentAllowed = false;
  }

  /* --- Public payment final gate --- */
  if (state.level === 'BLOCK_PUBLIC_PAYMENT' || reasons.includes('LOCKING_NUT_NO_KEY')) {
    publicPaymentAllowed = false;
  }
  // Weak GPS-only + long distance also blocks public.
  if (
    (conf === 'GPS_ONLY' || conf === 'WEAK_ADDRESS') &&
    distance != null &&
    distance >= T.highRiskDistanceMiles
  ) {
    publicPaymentAllowed = false;
    bumpLevel('BLOCK_PUBLIC_PAYMENT');
    if (!reasons.includes('MANUAL_REVIEW_REQUIRED')) reasons.push('MANUAL_REVIEW_REQUIRED');
    adminReasons.push('Weak location + long distance — confirm by phone before payment.');
  }

  /* --- Title / message --- */
  const channel: PricingChannel = input.pricingChannel ?? 'PUBLIC_SELF_BOOKING';
  const isAdmin = channel === 'ADMIN_PHONE_BOOKING';
  let title = 'Normal';
  let message = 'This job is within normal pricing rules.';
  if (state.level === 'REVIEW') {
    title = 'Review needed';
    message = 'Check the warnings before confirming.';
  } else if (state.level === 'HIGH_RISK') {
    title = 'High risk';
    message = 'Do not confirm without checking the recommended action.';
  } else if (state.level === 'BLOCK_PUBLIC_PAYMENT') {
    // Admin is on the call — never tell admin to "call first".
    title = isAdmin ? 'Manual handling required' : 'Call-first only';
    message = isAdmin
      ? 'Confirm price, payment and dispatch with the customer before creating the booking.'
      : 'This should be handled by admin before payment.';
  }

  /* --- Customer-safe message (only when public is blocked) --- */
  let customerSafeMessage: string | undefined;
  if (!publicPaymentAllowed) {
    customerSafeMessage =
      'We need to confirm availability for this location. Please call us to complete your emergency booking.';
  }

  /* --- Admin guidance fields ---
   * Admin-only derived fields. Public callers can ignore them entirely; the
   * shape is the same so we don't need a discriminated union.
   */
  const adminRequiredConfirmations: string[] = [];
  const adminRecommendedNextSteps: string[] = [];

  if (state.level !== 'NORMAL') {
    if (recommendedPaymentMode === 'DEPOSIT') {
      adminRecommendedNextSteps.push('Take a 15% deposit on card before dispatch.');
    } else if (recommendedPaymentMode === 'FULL') {
      adminRecommendedNextSteps.push('Take full payment on card before dispatch.');
    }
  }
  if (reasons.includes('LONG_DISTANCE_ASSESSMENT') && isAssessment) {
    adminRecommendedNextSteps.push(
      'If damage is likely, switch this to a replacement quote so travel is covered.',
    );
  }
  if (reasons.includes('CASH_ON_SITE_RISK')) {
    adminRequiredConfirmations.push(
      'Customer accepts cash on site for this distance and will have funds ready.',
    );
  }
  if (reasons.includes('GPS_ONLY_LOCATION') || reasons.includes('WEAK_LOCATION')) {
    adminRequiredConfirmations.push('Confirmed exact spot with the customer.');
  }
  if (reasons.includes('LOCKING_NUT_NO_KEY')) {
    adminRequiredConfirmations.push(
      'Customer understands a missing locking nut key may abort the job on site.',
    );
  }
  if (overrideRequiresReason) {
    adminRequiredConfirmations.push(
      'Override reason captured for going below the recommended minimum.',
    );
  }
  if (state.level === 'BLOCK_PUBLIC_PAYMENT') {
    adminRequiredConfirmations.push(
      'Verbally confirmed location, price and payment plan with the customer.',
    );
  }

  // Admin can proceed unless an explicit hard rule applies. Currently no rule
  // hard-blocks admin: even BLOCK_PUBLIC_PAYMENT lets admin continue after
  // confirming. Kept as a field so we can flip it later without a refactor.
  const adminCanProceed = true;
  const adminRequiresConfirmation =
    isAdmin && (state.level === 'HIGH_RISK' || state.level === 'BLOCK_PUBLIC_PAYMENT');

  return {
    level: state.level,
    title,
    message,
    reasons,
    adminReasons,
    ...(customerSafeMessage ? { customerSafeMessage } : {}),
    recommendedAction,
    recommendedPaymentMode,
    ...(minimumRecommendedTotalGbp ? { minimumRecommendedTotalGbp } : {}),
    publicPaymentAllowed,
    adminCanOverride,
    overrideRequiresReason,
    pricingChannel: channel,
    adminCanProceed,
    adminRequiresConfirmation,
    adminRequiredConfirmations,
    adminRecommendedNextSteps,
  };
}

/**
 * Async entry point used by the live pricing engine.
 *
 * Fetches the current thresholds (cached, defaults on failure) and runs
 * {@link evaluateProfitGuard}. Behaviour is identical for the same numeric
 * inputs when the stored settings match the defaults.
 */
export async function calculatePricingSafety(
  input: PricingSafetyInput,
): Promise<PricingSafetyResult> {
  const thresholds = await getPricingThresholds();
  return evaluateProfitGuard(input, thresholds);
}

/**
 * Synchronous variant for hot loops where we already have thresholds
 * resolved (e.g. iterating active bookings). Pass
 * {@link PRICING_THRESHOLD_DEFAULTS} when no settings are pre-fetched.
 */
export function calculatePricingSafetySync(
  input: PricingSafetyInput,
  thresholds: PricingThresholds = PRICING_THRESHOLD_DEFAULTS,
): PricingSafetyResult {
  return evaluateProfitGuard(input, thresholds);
}

