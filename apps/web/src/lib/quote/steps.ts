/**
 * Single source of truth for the customer-facing quote flow steps.
 *
 * The customer journey has exactly three steps:
 *   1. address — where to send the mobile fitter
 *   2. tyre    — tyre size, in-stock option, and locking wheel-nut status
 *   3. quote   — generated price + continue-to-payment
 *
 * Payment lives outside this list, on /checkout.
 *
 * Anything that needs the ordered step list (Stepper UI, reducer transitions,
 * persisted-progress validation, guards) MUST import from this file. Do not
 * duplicate the list elsewhere.
 */

import type { CapturedLocation } from '@/types/quote';

export const QUOTE_STEPS = ['address', 'tyre', 'quote'] as const;
export type QuoteStep = (typeof QUOTE_STEPS)[number];

export interface QuoteStepMeta {
  /** Page heading shown in the QuoteShell. */
  title: string;
  /** Sub-heading describing the step. */
  caption: string;
  /** Short label for the progress pills. */
  progressLabel: string;
}

export const STEP_META: Record<QuoteStep, QuoteStepMeta> = {
  address: {
    title: 'Where do you need help?',
    caption:
      'Step 1 of 3 — Tell us the address where the mobile tyre fitter should come.',
    progressLabel: 'Address',
  },
  tyre: {
    title: 'Pick your tyre',
    caption:
      'Step 2 of 3 — Enter your tyre size and choose from what we have in stock right now.',
    progressLabel: 'Tyre',
  },
  quote: {
    title: 'Your emergency quote',
    caption: 'Step 3 of 3 — Review your price, then continue to secure payment.',
    progressLabel: 'Quote',
  },
};

export function getStepIndex(step: QuoteStep): number {
  return QUOTE_STEPS.indexOf(step);
}

export function isValidStep(value: unknown): value is QuoteStep {
  return typeof value === 'string' && (QUOTE_STEPS as readonly string[]).includes(value);
}

export function getNextStep(step: QuoteStep): QuoteStep | null {
  const i = getStepIndex(step);
  if (i < 0 || i >= QUOTE_STEPS.length - 1) return null;
  return QUOTE_STEPS[i + 1] as QuoteStep;
}

export function getPrevStep(step: QuoteStep): QuoteStep | null {
  const i = getStepIndex(step);
  if (i <= 0) return null;
  return QUOTE_STEPS[i - 1] as QuoteStep;
}

/** Minimal subset of flow state used to evaluate step prerequisites. */
export interface QuoteGuardState {
  address: CapturedLocation | null;
  tyre: {
    size: string | null;
    /** Truthy presence is enough to pass the guard — callers may pass any
     * tyre selection shape; we only check non-null. */
    selected: object | null;
    lockingWheelNutStatus: 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY' | null;
  };
}

/** Returns true if every step before `step` is complete. */
export function canEnterStep(step: QuoteStep, state: QuoteGuardState): boolean {
  switch (step) {
    case 'address':
      return true;
    case 'tyre':
      return state.address !== null;
    case 'quote':
      return (
        state.address !== null &&
        state.tyre.selected !== null &&
        state.tyre.lockingWheelNutStatus !== null
      );
    default:
      return false;
  }
}

/**
 * Find the earliest step the user is allowed to be on, given current state.
 * Used when persisted progress points at a step further than its prereqs.
 */
export function earliestIncompleteStep(state: QuoteGuardState): QuoteStep {
  for (const s of QUOTE_STEPS) {
    if (!canEnterStep(s, state)) {
      // The guard for s failed — that means the previous step is incomplete.
      // Land on the previous step.
      const prev = getPrevStep(s);
      return prev ?? 'address';
    }
  }
  return 'quote';
}
