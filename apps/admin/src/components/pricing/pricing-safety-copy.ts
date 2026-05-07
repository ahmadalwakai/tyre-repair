/**
 * pricing-safety-copy.ts
 *
 * Maps the engine's `PricingSafetyClient` (which carries public/internal
 * wording such as "Call-first only" / "Call the customer first") into
 * admin-friendly copy for use inside the admin Quick Booking flow.
 *
 * The admin is already on the phone with the customer, so "call first"
 * phrasing is wrong here. We translate it to "confirm before dispatch" /
 * "manual handling required" instead.
 *
 * Public/customer-facing wording on the website is NOT changed by this
 * helper — it only applies to the admin app surfaces.
 */
import type {
  PricingRecommendedActionClient,
  PricingRecommendedPaymentModeClient,
  PricingRiskLevelClient,
  PricingSafetyClient,
} from '@/lib/api/quick-booking-helpers';

export interface AdminPricingSafetyCopy {
  /** Status badge label, e.g. "Manual handling required". */
  statusLabel: string;
  /** Card title — admin-friendly, never "Call-first only". */
  title: string;
  /** Card body message — admin-friendly. */
  message: string;
  /** Inline label for the recommended action row. */
  recommendedActionLabel: string;
  /** Inline label for the recommended payment row. */
  recommendedPaymentLabel: string;
  /**
   * Primary action button. `null` = no button (e.g. when there is nothing
   * useful to apply automatically).
   */
  primaryButton:
    | {
        label: string;
        /** What the press handler should do. */
        kind: 'apply_payment_mode' | 'manual_review' | 'review_only';
        /** Only set when `kind === 'apply_payment_mode'`. */
        paymentMode?: PricingRecommendedPaymentModeClient;
      }
    | null;
  /** Cleaned-up admin reasons (rewrites a few awkward engine phrases). */
  adminReasons: string[];
  /**
   * Optional next-step suggestions surfaced to the admin (guidance, not
   * gating). Comes from the engine when present.
   */
  adminRecommendedNextSteps: string[];
  /**
   * Optional confirmations the admin must tick before creating a booking
   * that public would have blocked.
   */
  adminRequiredConfirmations: string[];
  /** True when the engine asked for an explicit admin confirmation. */
  adminRequiresConfirmation: boolean;
}

const STATUS_LABEL: Record<PricingRiskLevelClient, string> = {
  NORMAL: 'Normal',
  REVIEW: 'Review needed',
  HIGH_RISK: 'High risk',
  BLOCK_PUBLIC_PAYMENT: 'Manual handling required',
};

const PAYMENT_MODE_LABEL: Record<PricingRecommendedPaymentModeClient, string> = {
  CASH: 'Cash on site',
  DEPOSIT: '15% deposit',
  FULL: 'Full upfront',
  MANUAL_REVIEW: 'Manual review',
};

interface ActionCopy {
  title: string;
  message: string;
  actionLabel: string;
}

/**
 * Per-recommendedAction admin copy. Public wording like "Call the customer
 * first" is replaced with admin wording like "Confirm details with customer".
 */
const ACTION_COPY: Record<PricingRecommendedActionClient, ActionCopy> = {
  CONTINUE: {
    title: 'Normal',
    message: 'Pricing looks healthy. You can continue.',
    actionLabel: 'Continue',
  },
  TAKE_DEPOSIT: {
    title: 'Deposit recommended',
    message: 'Take a deposit to protect this job before dispatch.',
    actionLabel: 'Use deposit',
  },
  REQUIRE_FULL_PAYMENT: {
    title: 'Full payment recommended',
    message: 'Require full payment up-front before dispatch.',
    actionLabel: 'Use full payment',
  },
  CALL_FIRST: {
    // Admin is already on the call — translate "call first" into
    // "confirm before dispatch".
    title: 'Admin confirmation required',
    message: 'This job needs admin confirmation before payment or dispatch.',
    actionLabel: 'Confirm details with customer',
  },
  ADMIN_REVIEW: {
    title: 'Review needed',
    message: 'Review the price and details before confirming this booking.',
    actionLabel: 'Review before confirming',
  },
  SWITCH_TO_REPLACEMENT: {
    title: 'Replacement may be safer',
    message:
      'A repair/assessment may not cover travel for this job. Consider quoting a replacement instead.',
    actionLabel: 'Consider replacement quote',
  },
  CREATE_AS_ASSESSMENT_FIRST: {
    title: 'Assessment-first recommended',
    message: 'Create this as an assessment first, then convert to replacement if needed.',
    actionLabel: 'Create as assessment first',
  },
};

/**
 * Rewrite a single engine `adminReasons` line into the friendlier admin
 * phrasing. Anything we don't recognise is passed through unchanged.
 */
function rewriteAdminReason(raw: string): string {
  // "Outside normal coverage (~68 mi from base). Confirm we can dispatch."
  if (/^Outside normal coverage/i.test(raw)) {
    return 'Very far from base — confirm dispatch is possible.';
  }
  // "Long-distance assessment may not cover travel — consider full payment or convert to replacement."
  if (/^Long-distance assessment may not cover travel/i.test(raw)) {
    return 'Assessment may not cover travel. Take deposit/full payment or quote replacement.';
  }
  // "Very long-distance assessment (68 mi). Public should call first."
  if (/^Very long-distance assessment/i.test(raw)) {
    return 'Very long-distance assessment. Admin must confirm price before dispatch.';
  }
  // Strip any stray "public should call first" mentions inside admin UI.
  if (/public should call first/i.test(raw)) {
    return raw.replace(/\.?\s*Public should call first\.?/i, '').trim() ||
      'Admin must confirm before dispatch.';
  }
  return raw;
}

function buildPrimaryButton(
  safety: PricingSafetyClient,
): AdminPricingSafetyCopy['primaryButton'] {
  // Manual-handling levels — admin must review the job before picking a
  // payment plan. Do NOT silently apply CASH here: "manual review" means
  // exactly that, the admin decides. The button opens the override / manual
  // confirmation flow.
  if (
    safety.recommendedAction === 'ADMIN_REVIEW' ||
    safety.level === 'BLOCK_PUBLIC_PAYMENT' ||
    safety.recommendedPaymentMode === 'MANUAL_REVIEW'
  ) {
    return {
      label: 'Confirm manually',
      kind: 'manual_review',
    };
  }
  if (safety.recommendedAction === 'TAKE_DEPOSIT') {
    return {
      label: 'Use 15% deposit',
      kind: 'apply_payment_mode',
      paymentMode: 'DEPOSIT',
    };
  }
  if (safety.recommendedAction === 'REQUIRE_FULL_PAYMENT') {
    return {
      label: 'Use full payment',
      kind: 'apply_payment_mode',
      paymentMode: 'FULL',
    };
  }
  // Otherwise drive the button from the recommended payment mode itself.
  switch (safety.recommendedPaymentMode) {
    case 'DEPOSIT':
      return {
        label: 'Use 15% deposit',
        kind: 'apply_payment_mode',
        paymentMode: 'DEPOSIT',
      };
    case 'FULL':
      return {
        label: 'Use full payment',
        kind: 'apply_payment_mode',
        paymentMode: 'FULL',
      };
    case 'CASH':
      return {
        label: 'Use cash on site',
        kind: 'apply_payment_mode',
        paymentMode: 'CASH',
      };
  }
  return null;
}

export function getAdminPricingSafetyCopy(
  safety: PricingSafetyClient,
): AdminPricingSafetyCopy {
  const action = ACTION_COPY[safety.recommendedAction];

  // Long-distance assessment gets a dedicated, more useful admin message
  // regardless of the recommendedAction the engine picked.
  const isLongDistanceAssessment = safety.reasons.includes('LONG_DISTANCE_ASSESSMENT');

  // BLOCK_PUBLIC_PAYMENT trumps action-derived title/message.
  let title = action.title;
  let message = action.message;
  if (safety.level === 'BLOCK_PUBLIC_PAYMENT') {
    title = 'Manual handling required';
    message = 'This job should be handled by admin before payment or dispatch.';
  } else if (isLongDistanceAssessment) {
    title = 'Long-distance assessment';
    message =
      'This assessment is far from base. Confirm the price and take deposit or full payment before dispatch.';
  }

  return {
    statusLabel: STATUS_LABEL[safety.level],
    title,
    message,
    recommendedActionLabel: action.actionLabel,
    recommendedPaymentLabel: PAYMENT_MODE_LABEL[safety.recommendedPaymentMode],
    primaryButton: buildPrimaryButton(safety),
    adminReasons: safety.adminReasons.map(rewriteAdminReason),
    adminRecommendedNextSteps: safety.adminRecommendedNextSteps ?? [],
    adminRequiredConfirmations: safety.adminRequiredConfirmations ?? [],
    adminRequiresConfirmation: safety.adminRequiresConfirmation ?? false,
  };
}
