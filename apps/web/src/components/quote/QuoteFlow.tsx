'use client';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Stack } from '@chakra-ui/react';
import { QuoteShell } from './QuoteShell';
import { QuoteProgress } from './QuoteProgress';
import { LocationCaptureStep } from './LocationCaptureStep';
import { TyreSelectionStep, type TyrePayload } from './TyreSelectionStep';
import { QuoteDisplayStep } from './QuoteDisplayStep';
import { RestoreQuotePrompt } from './RestoreQuotePrompt';
import { StickyQuoteActions } from './StickyQuoteActions';
import { MiniProgressBubble } from '@/components/mobile/MiniProgressBubble';
import {
  QUOTE_STEPS,
  STEP_META,
  canEnterStep,
  earliestIncompleteStep,
  isValidStep,
  type QuoteStep,
} from '@/lib/quote/steps';
import {
  clearQuoteProgress,
  loadQuoteProgress,
  saveQuoteProgress,
  type PersistedTyre,
  type QuoteProgressSnapshot,
} from '@/lib/quote/progress-storage';
import type { AddressData } from '@/types/quote';
import type { LockingWheelNutStatus } from '@/lib/bookings/types';

interface FlowState {
  step: QuoteStep;
  address: AddressData | null;
  tyre: {
    size: string | null;
    selected: TyrePayload['selected'] | null;
    lockingWheelNutStatus: LockingWheelNutStatus | null;
  };
}

type Action =
  | { type: 'set_address'; address: AddressData }
  | { type: 'set_tyre'; payload: TyrePayload }
  | { type: 'goto_step'; step: QuoteStep }
  | { type: 'restore'; state: FlowState };

const INITIAL_STATE: FlowState = {
  step: 'address',
  address: null,
  tyre: { size: null, selected: null, lockingWheelNutStatus: null },
};

function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'set_address':
      return { ...state, address: action.address, step: 'tyre' };
    case 'set_tyre': {
      const { size, selected, lockingWheelNutStatus } = action.payload;
      return {
        ...state,
        tyre: { size, selected, lockingWheelNutStatus },
        step: 'quote',
      };
    }
    case 'goto_step': {
      // Strict guard — never let the user jump to a step whose prereqs are
      // not met. Snap back to the earliest incomplete step instead.
      if (canEnterStep(action.step, state)) {
        return { ...state, step: action.step };
      }
      return { ...state, step: earliestIncompleteStep(state) };
    }
    case 'restore':
      return action.state;
  }
}

function buildPersistedTyre(
  state: FlowState,
): PersistedTyre {
  return {
    size: state.tyre.size,
    selected: state.tyre.selected
      ? {
          id: state.tyre.selected.id,
          brand: state.tyre.selected.brand,
          model: state.tyre.selected.model,
          price: state.tyre.selected.price,
        }
      : null,
    lockingWheelNutStatus: state.tyre.lockingWheelNutStatus,
  };
}

/**
 * Orchestrates the 3-step customer quote flow:
 *   address → tyre → quote (review) → /checkout
 *
 * Step config, guards, and prereq logic all come from `@/lib/quote/steps`.
 */
export function QuoteFlow() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  // The detected-but-not-yet-applied snapshot. Null means either no saved
  // progress, the saved progress is too thin to be useful, or the user has
  // already chosen to resume/discard.
  const [pendingResume, setPendingResume] = useState<QuoteProgressSnapshot | null>(
    null,
  );
  const checkedStorageRef = useRef(false);
  // Suppress saving until the user has explicitly resumed or dismissed the
  // prompt — otherwise the very first reducer state would overwrite the
  // snapshot we're trying to offer.
  const persistEnabledRef = useRef(true);

  // On mount, look for a v2 snapshot. We only offer to resume if the user
  // got at least past the address step — otherwise there's nothing useful
  // to restore. TTL/version checks live inside loadQuoteProgress().
  useEffect(() => {
    if (checkedStorageRef.current) return;
    checkedStorageRef.current = true;
    const snapshot = loadQuoteProgress();
    if (!snapshot || !snapshot.address) {
      return;
    }
    persistEnabledRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingResume(snapshot);
  }, []);

  // Persist progress whenever meaningful state changes — but only after
  // the user has resolved any pending resume prompt.
  useEffect(() => {
    if (!persistEnabledRef.current) return;
    if (
      state.step === 'address' &&
      !state.address &&
      !state.tyre.selected
    ) {
      // Nothing meaningful yet.
      return;
    }
    saveQuoteProgress({
      step: state.step,
      address: state.address,
      tyre: buildPersistedTyre(state),
    });
  }, [state]);

  function handleResume() {
    const snapshot = pendingResume;
    if (!snapshot) return;
    const guardState = {
      address: snapshot.address,
      tyre: {
        size: snapshot.tyre.size,
        selected: snapshot.tyre.selected ? { tyreId: snapshot.tyre.selected.id } : null,
        lockingWheelNutStatus: snapshot.tyre.lockingWheelNutStatus,
      },
    };
    const requestedStep = isValidStep(snapshot.step) ? snapshot.step : 'address';
    const safeStep = canEnterStep(requestedStep, guardState)
      ? requestedStep
      : earliestIncompleteStep(guardState);
    dispatch({
      type: 'restore',
      state: {
        step: safeStep,
        address: snapshot.address,
        tyre: {
          size: snapshot.tyre.size,
          // Force a tyre re-selection so we re-validate live stock
          // before charging.
          selected: null,
          lockingWheelNutStatus: snapshot.tyre.lockingWheelNutStatus,
        },
      },
    });
    persistEnabledRef.current = true;
    setPendingResume(null);
  }

  function handleDiscard() {
    clearQuoteProgress();
    persistEnabledRef.current = true;
    setPendingResume(null);
    // Reducer is already at INITIAL_STATE; nothing else to reset.
  }

  const meta = STEP_META[state.step];
  const stepIndex = QUOTE_STEPS.indexOf(state.step);
  const stepCaption = `Step ${stepIndex + 1} of ${QUOTE_STEPS.length}`;

  return (
    <QuoteShell title={meta.title} description={meta.caption}>
      <Stack gap="6" pb={{ base: '24', md: '0' }}>
        {pendingResume && (
          <RestoreQuotePrompt
            onResume={handleResume}
            onDiscard={handleDiscard}
            savedAt={new Date(pendingResume.updatedAt)}
          />
        )}
        <QuoteProgress current={state.step} />

        {state.step === 'address' && (
          <LocationCaptureStep
            initial={state.address}
            onContinue={(address) => dispatch({ type: 'set_address', address })}
          />
        )}

        {state.step === 'tyre' && state.address && (
          <TyreSelectionStep
            initial={
              state.tyre.selected && state.tyre.size && state.tyre.lockingWheelNutStatus
                ? {
                    size: state.tyre.size,
                    selected: state.tyre.selected,
                    lockingWheelNutStatus: state.tyre.lockingWheelNutStatus,
                  }
                : null
            }
            onContinue={(payload) => dispatch({ type: 'set_tyre', payload })}
            onBack={() => dispatch({ type: 'goto_step', step: 'address' })}
          />
        )}

        {state.step === 'quote' &&
          state.address &&
          state.tyre.selected &&
          state.tyre.lockingWheelNutStatus && (
            <QuoteDisplayStep
              address={state.address}
              tyre={{
                size: state.tyre.size ?? '',
                selected: state.tyre.selected,
                lockingWheelNutStatus: state.tyre.lockingWheelNutStatus,
              }}
              onBack={() => dispatch({ type: 'goto_step', step: 'tyre' })}
            />
          )}
      </Stack>

      <StickyQuoteActions
        primaryLabel={state.step === 'quote' ? 'Continue to checkout' : 'Continue'}
        caption={stepCaption}
        secondaryLabel="Call us"
        onSecondary={() => {
          const tel = process.env['NEXT_PUBLIC_BUSINESS_PHONE_E164'];
          if (tel && typeof window !== 'undefined') {
            try {
              import('@/lib/lead-events/call-click')
                .then(({ reportCallClick }) => {
                  reportCallClick({ sourceComponent: 'QuoteFlow.stickyCallUs' });
                })
                .catch(() => {
                  /* never block tel: */
                });
            } catch {
              /* never block tel: */
            }
            window.location.href = `tel:${tel}`;
          }
        }}
      />
      <MiniProgressBubble current={state.step} />
    </QuoteShell>
  );
}
