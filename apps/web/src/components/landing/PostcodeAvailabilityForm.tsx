'use client';

import {
  Box,
  Button,
  HStack,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useId, useState, type FormEvent } from 'react';
import type {
  AvailabilityApiResponse,
  PostcodeAvailabilityResult,
} from '@/types/coverage';
import { trackEvent, trackPostcodeResultEvent } from '@/lib/analytics/track';

export interface PostcodeAvailabilityFormProps {
  /** Tracking source label, e.g. "lp_emergency_mobile_tyre_fitting". */
  source: string;
  intent?: string;
  /** Optional callback when a result is received (success or error). */
  onResult?: (result: PostcodeAvailabilityResult | null) => void;
}

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; result: PostcodeAvailabilityResult };

/**
 * Conversion-first postcode form for Google Ads landing pages.
 *
 * - Mobile-first 360px layout, large tap targets, visible focus.
 * - Renders an `aria-live` result region (handled by `AvailabilityResultCard`
 *   consumer); errors are announced in-line via `aria-describedby`.
 * - Never blocks the call/booking flow if analytics fails.
 */
export function PostcodeAvailabilityForm({
  source,
  intent = 'emergency_mobile_tyre_fitting',
  onResult,
}: PostcodeAvailabilityFormProps): React.ReactNode {
  const [postcode, setPostcode] = useState('');
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });
  const inputId = useId();
  const errorId = useId();

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const value = postcode.trim();
    if (!value) {
      setState({ kind: 'error', message: 'Enter your postcode.' });
      return;
    }

    trackEvent('postcode_submit', { source, intent });
    setState({ kind: 'loading' });

    try {
      const res = await fetch('/api/availability/postcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcode: value, intent, source }),
      });
      const json = (await res.json()) as AvailabilityApiResponse<PostcodeAvailabilityResult>;
      if (!json.ok) {
        setState({ kind: 'error', message: json.error.message });
        onResult?.(null);
        return;
      }
      setState({ kind: 'success', result: json.data });
      trackPostcodeResultEvent(json.data.status, {
        source,
        intent,
        outwardCode: json.data.outwardCode,
        zoneSlug: json.data.matchedZone?.slug ?? null,
      });
      onResult?.(json.data);
    } catch {
      setState({
        kind: 'error',
        message: 'Could not check availability. Please call us directly.',
      });
      onResult?.(null);
    }
  }

  const isLoading = state.kind === 'loading';
  const isError = state.kind === 'error';

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '28rem' }}>
      <Stack gap="3">
        <Box>
          <label
            htmlFor={inputId}
            style={{
              color: 'var(--chakra-colors-fg-default)',
              fontWeight: 600,
              fontSize: 'var(--chakra-fontSizes-sm)',
              marginBottom: '0.5rem',
              display: 'block',
            }}
          >
            Your postcode
          </label>
          <HStack gap="2" align="stretch">
            <Input
              id={inputId}
              value={postcode}
              onChange={(e) => setPostcode(e.currentTarget.value)}
              placeholder="e.g. G1 1AA"
              autoComplete="postal-code"
              inputMode="text"
              size="lg"
              minH="48px"
              fontSize="md"
              aria-invalid={isError}
              aria-describedby={isError ? errorId : undefined}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="lg"
              minH="48px"
              minW="44px"
              loading={isLoading}
              loadingText="Checking"
              colorPalette="yellow"
              variant="solid"
            >
              Check
            </Button>
          </HStack>
          {isError ? (
            <Text id={errorId} color="red.500" fontSize="sm" mt="2" role="alert">
              {state.message}
            </Text>
          ) : null}
        </Box>
      </Stack>
    </form>
  );
}
