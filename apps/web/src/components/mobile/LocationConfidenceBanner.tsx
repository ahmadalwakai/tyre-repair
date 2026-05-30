'use client';

import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { FiCheckCircle, FiAlertCircle, FiMapPin } from 'react-icons/fi';
import type { CapturedLocation } from '@/types/quote';

export interface LocationConfidenceBannerProps {
  location: CapturedLocation;
  onImprove?: () => void;
}

type Confidence = 'confirmed' | 'gps_only' | 'weak';

function classify(loc: CapturedLocation): Confidence {
  // GPS-only: came from current_location but missing line1/postcode is not
  // typical because we already block on missing postcode upstream — but
  // we still treat browser geolocation as GPS-style confidence.
  if (loc.method === 'browser_geolocation') return 'gps_only';
  if (loc.method === 'mapbox_autocomplete') return 'confirmed';
  // Manual address with no coordinates is the weakest case.
  if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
    return 'weak';
  }
  return 'confirmed';
}

const COPY: Record<Confidence, { title: string; body: string; tone: 'good' | 'warn' | 'info' }> = {
  confirmed: {
    title: 'Location received',
    body: 'We have the address we need.',
    tone: 'good',
  },
  gps_only: {
    title: 'GPS location received',
    body: 'The fitter may call to confirm the exact spot.',
    tone: 'info',
  },
  weak: {
    title: 'Location needs confirmation',
    body: 'Add a postcode or building number so we find you faster.',
    tone: 'warn',
  },
};

/**
 * Compact reassurance banner shown after the customer captures a location.
 *
 * Never blocks the flow — at worst it offers an "Improve address" link if
 * the parent provides one.
 */
export function LocationConfidenceBanner({ location, onImprove }: LocationConfidenceBannerProps) {
  const conf = classify(location);
  const copy = COPY[conf];

  const borderColor =
    copy.tone === 'good'
      ? 'border.gold'
      : copy.tone === 'warn'
        ? 'red.400'
        : 'border.subtle';

  const Icon = copy.tone === 'warn' ? FiAlertCircle : copy.tone === 'good' ? FiCheckCircle : FiMapPin;

  return (
    <HStack
      gap="3"
      p="3"
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      bg="bg.surface"
      align="flex-start"
    >
      <Box color="accent.neon" fontSize="lg" mt="0.5" aria-hidden>
        <Icon />
      </Box>
      <Stack gap="0" flex="1" minW="0">
        <Text fontWeight="semibold" color="fg.default" fontSize="sm">
          {copy.title}
        </Text>
        <Text color="fg.muted" fontSize="xs">
          {copy.body}
        </Text>
      </Stack>
      {conf !== 'confirmed' && onImprove && (
        <button
          type="button"
          onClick={onImprove}
          style={{
            all: 'unset',
            cursor: 'pointer',
            color: '#E30613',
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '6px 8px',
            minHeight: '32px',
          }}
          aria-label="Improve address"
        >
          Improve address
        </button>
      )}
    </HStack>
  );
}
