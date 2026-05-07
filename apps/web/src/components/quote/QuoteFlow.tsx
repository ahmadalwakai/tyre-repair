'use client';
import { useEffect, useReducer, useState } from 'react';
import { Stack, Text } from '@chakra-ui/react';
import { QuoteShell } from './QuoteShell';
import { QuoteProgress } from './QuoteProgress';
import { VehicleLookupStep } from './VehicleLookupStep';
import { TyreSelectionStep, type TyreTriageResult } from './TyreSelectionStep';
import { LocationCaptureStep } from './LocationCaptureStep';
import { QuoteDisplayStep } from './QuoteDisplayStep';
import { EmergencyAssistCard } from './EmergencyAssistCard';
import { CallBackRescueCard } from './CallBackRescueCard';
import { SaveProgressCard } from './SaveProgressCard';
import { RestoreQuotePrompt } from './RestoreQuotePrompt';
import { QuoteExitIntentPrompt } from './QuoteExitIntentPrompt';
import { StickyQuoteActions } from './StickyQuoteActions';
import {
  clearQuoteProgress,
  saveQuoteProgress,
  type QuoteProgressSnapshot,
} from '@/lib/quote/progress-storage';
import type {
  CapturedLocation,
  QuoteFlowStep,
  VehicleSelection,
} from '@/types/quote';

type EmergencyLocationConfidence =
  | 'CONFIRMED_ADDRESS'
  | 'GPS_ONLY'
  | 'WEAK_ADDRESS'
  | 'MISSING_LOCATION';

function deriveLocationLabel(loc: CapturedLocation): string | null {
  const parts = [loc.addressLine1, loc.addressLine2, loc.city, loc.postcode].filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

function deriveLocationConfidence(loc: CapturedLocation): EmergencyLocationConfidence {
  const hasCoords = typeof loc.latitude === 'number' && typeof loc.longitude === 'number';
  const hasAddress = Boolean(loc.addressLine1 || loc.postcode || loc.city);
  if (hasCoords && hasAddress) return 'CONFIRMED_ADDRESS';
  if (hasCoords) return 'GPS_ONLY';
  if (hasAddress) return 'WEAK_ADDRESS';
  return 'MISSING_LOCATION';
}

async function patchEmergencyAssistLocation(
  eventId: string,
  loc: CapturedLocation,
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {
      locationConfidence: deriveLocationConfidence(loc),
    };
    const label = deriveLocationLabel(loc);
    if (label) body['locationLabel'] = label;
    if (typeof loc.latitude === 'number') body['latitude'] = loc.latitude;
    if (typeof loc.longitude === 'number') body['longitude'] = loc.longitude;
    const res = await fetch(
      `/api/lead-events/emergency-assist/${encodeURIComponent(eventId)}/location`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

interface State {
  step: QuoteFlowStep;
  vehicle: VehicleSelection | null;
  triage: TyreTriageResult | null;
  location: CapturedLocation | null;
  isEmergencyAssistMode: boolean;
  /** Returned from POST /api/lead-events/emergency-assist; used to PATCH the
   * same lead with location once it is captured. */
  emergencyAssistEventId: string | null;
  /** When true, show a small acknowledgement on the next location/quote step
   * confirming the customer's location has been forwarded to admin. */
  emergencyLocationSent: boolean;
}

type Action =
  | { type: 'set_vehicle'; vehicle: VehicleSelection }
  | { type: 'set_triage'; triage: TyreTriageResult }
  | { type: 'set_location'; location: CapturedLocation }
  | { type: 'go_to'; step: QuoteFlowStep }
  | { type: 'enable_emergency_mode' }
  | { type: 'disable_emergency_mode' }
  | { type: 'emergency_continue_to_location' }
  | { type: 'set_emergency_event_id'; eventId: string }
  | { type: 'mark_emergency_location_sent' }
  | { type: 'restore'; snapshot: Partial<State> & { step: QuoteFlowStep } };

const initialState: State = {
  step: 'vehicle',
  vehicle: null,
  triage: null,
  location: null,
  isEmergencyAssistMode: false,
  emergencyAssistEventId: null,
  emergencyLocationSent: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set_vehicle': {
      // In emergency mode, auto-triage and skip the tyre step.
      if (state.isEmergencyAssistMode) {
        return {
          ...state,
          vehicle: action.vehicle,
          triage: {
            jobType: 'ASSESSMENT',
            tyreProblemType: 'NOT_SURE',
            selectedTyre: null,
            backupTyre: null,
          },
          step: 'location',
        };
      }
      return { ...state, vehicle: action.vehicle, step: 'tyre' };
    }
    case 'set_triage':
      return { ...state, triage: action.triage, step: 'location' };
    case 'set_location':
      return { ...state, location: action.location, step: 'quote' };
    case 'go_to':
      return { ...state, step: action.step };
    case 'enable_emergency_mode':
      return { ...state, isEmergencyAssistMode: true };
    case 'disable_emergency_mode': {
      // Clear an auto-created assessment triage if it was created only for
      // emergency mode (no manually selected tyre). Preserve manually entered
      // vehicle and location data.
      const isAutoTriage =
        state.triage?.jobType === 'ASSESSMENT' &&
        state.triage?.tyreProblemType === 'NOT_SURE' &&
        !state.triage?.selectedTyre &&
        !state.triage?.backupTyre;
      return {
        ...state,
        isEmergencyAssistMode: false,
        emergencyAssistEventId: null,
        emergencyLocationSent: false,
        triage: isAutoTriage ? null : state.triage,
      };
    }
    case 'emergency_continue_to_location': {
      const existing = state.triage;
      return {
        ...state,
        isEmergencyAssistMode: true,
        triage: {
          jobType: 'ASSESSMENT',
          tyreProblemType: existing?.tyreProblemType ?? 'NOT_SURE',
          selectedTyre: null,
          backupTyre: null,
        },
        step: 'location',
      };
    }
    case 'set_emergency_event_id':
      return { ...state, emergencyAssistEventId: action.eventId };
    case 'mark_emergency_location_sent':
      return { ...state, emergencyLocationSent: true };
    case 'restore':
      return { ...state, ...action.snapshot };
  }
}

export function QuoteFlow() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showRescue, setShowRescue] = useState(false);

  // Auto-save quote progress whenever core state changes.
  useEffect(() => {
    if (
      state.step === 'vehicle' &&
      !state.vehicle &&
      !state.triage &&
      !state.location &&
      !state.isEmergencyAssistMode
    ) {
      // Nothing meaningful to persist yet.
      return;
    }
    saveQuoteProgress({
      vehicle: state.vehicle
        ? {
            registration: state.vehicle.registration ?? null,
            make: state.vehicle.make ?? null,
            model: state.vehicle.model ?? null,
            year: state.vehicle.year ?? null,
            manualTyreSize: state.vehicle.manualTyreSize ?? null,
          }
        : null,
      tyreProblemType: state.triage?.tyreProblemType ?? null,
      jobType: state.triage?.jobType ?? null,
      selectedTyreId: state.triage?.selectedTyre?.tyreId ?? null,
      backupTyreId: state.triage?.backupTyre?.tyreId ?? null,
      location: state.location,
      isEmergencyAssistMode: state.isEmergencyAssistMode,
      emergencyAssistEventId: state.emergencyAssistEventId,
    });
  }, [state]);

  const titleByStep: Record<QuoteFlowStep, { title: string; description?: string }> = {
    vehicle: {
      title: 'Get your instant emergency tyre quote',
      description:
        'Step 1 of 4 — Tell us your vehicle so we can find the right tyres. We never ask for a date or time.',
    },
    tyre: {
      title: 'Tell us about the tyre',
      description:
        'Step 2 of 4 — Let us know what happened. We will repair if possible and only replace if needed.',
    },
    location: {
      title: 'Where do you need help?',
      description:
        'Step 3 of 4 — Use your current location or enter the address where the mobile tyre fitter should come.',
    },
    quote: {
      title: 'Your emergency quote',
      description: 'Step 4 of 4 — Review the price and continue when ready.',
    },
  };

  const stepCaption: Record<QuoteFlowStep, string> = {
    vehicle: 'Step 1 of 4',
    tyre: 'Step 2 of 4',
    location: 'Step 3 of 4',
    quote: 'Step 4 of 4',
  };

  const sourcePage = `quote.${state.step}`;
  const exitDisabled = state.step === 'quote';

  return (
    <QuoteShell
      title={titleByStep[state.step].title}
      {...(titleByStep[state.step].description
        ? { description: titleByStep[state.step].description }
        : {})}
    >
      <Stack gap="6" pb={{ base: '24', md: '0' }}>
        <QuoteProgress current={state.step} />

        {state.isEmergencyAssistMode && state.emergencyLocationSent && state.step === 'quote' && (
          <Stack
            gap="1"
            p={{ base: '3', md: '4' }}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border.gold"
            bg="bg.surface"
          >
            <Text fontFamily="heading" color="accent.neon" fontSize="sm">
              Location received
            </Text>
            <Text color="fg.muted" fontSize="xs">
              We&apos;ve updated your emergency request. Continue to your quote so we can price the
              emergency callout.
            </Text>
          </Stack>
        )}

        {state.step === 'vehicle' && (
          <>
            <RestoreQuotePrompt
              onContinue={(snapshot: QuoteProgressSnapshot) => {
                // We only restore the lightweight context. Vehicle look-up
                // and tyre catalogue items must be re-resolved when the user
                // re-enters their reg, so just hop to the furthest known step
                // that does not require a tyre object.
                if (snapshot.location) {
                  dispatch({
                    type: 'restore',
                    snapshot: {
                      step: 'location',
                      location: snapshot.location,
                      isEmergencyAssistMode: snapshot.isEmergencyAssistMode,
                      emergencyAssistEventId: snapshot.emergencyAssistEventId ?? null,
                    },
                  });
                }
              }}
              onDiscard={() => clearQuoteProgress()}
            />
            <EmergencyAssistCard
              active={state.isEmergencyAssistMode}
              emergencyAssistEventId={state.emergencyAssistEventId}
              onActivate={() => dispatch({ type: 'enable_emergency_mode' })}
              onContinueToLocation={() =>
                dispatch({ type: 'emergency_continue_to_location' })
              }
              onDeactivate={() => dispatch({ type: 'disable_emergency_mode' })}
              onEventIdAcquired={(eventId) =>
                dispatch({ type: 'set_emergency_event_id', eventId })
              }
            />
            <VehicleLookupStep
              initial={state.vehicle}
              onContinue={(vehicle) => dispatch({ type: 'set_vehicle', vehicle })}
            />
          </>
        )}
        {state.step === 'tyre' && (
          <>
            {!state.isEmergencyAssistMode && (
              <SaveProgressCard
                sourcePage="quote.tyre"
                tyreProblemType={state.triage?.tyreProblemType ?? null}
                vehicleRegistration={state.vehicle?.registration ?? null}
              />
            )}
            <TyreSelectionStep
              vehicle={state.vehicle}
              initial={state.triage}
              onContinue={(triage) => dispatch({ type: 'set_triage', triage })}
              onBack={() => dispatch({ type: 'go_to', step: 'vehicle' })}
            />
          </>
        )}
        {state.step === 'location' && (
          <LocationCaptureStep
            initial={state.location}
            onContinue={(location) => {
              dispatch({ type: 'set_location', location });
              if (state.isEmergencyAssistMode && state.emergencyAssistEventId) {
                void patchEmergencyAssistLocation(
                  state.emergencyAssistEventId,
                  location,
                ).then((ok) => {
                  if (ok) dispatch({ type: 'mark_emergency_location_sent' });
                });
              }
            }}
            onBack={() =>
              dispatch({ type: 'go_to', step: state.isEmergencyAssistMode ? 'vehicle' : 'tyre' })
            }
          />
        )}
        {state.step === 'quote' && state.triage && (
          <QuoteDisplayStep
            vehicle={state.vehicle}
            triage={state.triage}
            location={state.location}
            onBack={() => dispatch({ type: 'go_to', step: 'location' })}
          />
        )}

        {showRescue && state.step !== 'quote' && (
          <CallBackRescueCard
            sourcePage={sourcePage}
            tyreProblemType={state.triage?.tyreProblemType ?? null}
          />
        )}
      </Stack>

      <StickyQuoteActions
        primaryLabel={state.step === 'quote' ? 'Continue to checkout' : 'Continue'}
        caption={stepCaption[state.step]}
        secondaryLabel="Call us"
        onSecondary={() => {
          const tel = process.env.NEXT_PUBLIC_BUSINESS_PHONE_E164;
          if (tel && typeof window !== 'undefined') {
            try {
              // fire-and-forget call-click report
              import('@/lib/lead-events/call-click').then(({ reportCallClick }) => {
                reportCallClick({ sourceComponent: 'QuoteFlow.stickyCallUs' });
              });
            } catch {
              /* never block tel: */
            }
            window.location.href = `tel:${tel}`;
          }
        }}
      />

      <QuoteExitIntentPrompt
        disabled={exitDisabled}
        onWantsCallback={() => setShowRescue(true)}
      />
    </QuoteShell>
  );
}

