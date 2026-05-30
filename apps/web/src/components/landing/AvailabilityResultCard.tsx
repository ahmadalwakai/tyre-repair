'use client';

import { Box, Stack, Text } from '@chakra-ui/react';
import type { PostcodeAvailabilityResult } from '@/types/coverage';
import { EmergencyCallActions } from './EmergencyCallActions';

export interface AvailabilityResultCardProps {
  result: PostcodeAvailabilityResult | null;
  /** When true and `result` is null, render a friendly empty placeholder. */
  showEmptyState?: boolean;
  /** Tracking source forwarded to tel/WhatsApp clicks. */
  source: string;
}

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

function formatFee(pence: number | null): string | null {
  if (pence === null) return null;
  return GBP.format(pence / 100);
}

interface StateCopy {
  toneBg: string;
  toneBorder: string;
  headline: string;
  body: string;
}

function copyFor(result: PostcodeAvailabilityResult): StateCopy {
  switch (result.status) {
    case 'available_now':
      return {
        toneBg: 'green.50',
        toneBorder: 'green.300',
        headline: `We can dispatch to ${result.matchedZone?.cityOrRegion ?? 'your area'} now`,
        body: `Typical response: ${result.estimatedResponseTimeLabel}.`,
      };
    case 'available_today':
      return {
        toneBg: 'yellow.50',
        toneBorder: 'yellow.300',
        headline: `Same-day mobile cover in ${result.matchedZone?.cityOrRegion ?? 'your area'}`,
        body: 'Call now to confirm a dispatch slot today.',
      };
    case 'available_tomorrow':
      return {
        toneBg: 'orange.50',
        toneBorder: 'orange.300',
        headline: `Next-day mobile cover in ${result.matchedZone?.cityOrRegion ?? 'your area'}`,
        body: 'Call to confirm the earliest dispatch window.',
      };
    case 'not_currently_covered':
      return {
        toneBg: 'red.50',
        toneBorder: 'red.300',
        headline: 'Not currently covered',
        body: result.nearestCoverageZone
          ? `Closest active zone: ${result.nearestCoverageZone.name}. Call us to discuss options.`
          : 'Please call us to discuss options.',
      };
  }
}

export function AvailabilityResultCard({
  result,
  showEmptyState,
  source,
}: AvailabilityResultCardProps): React.ReactNode {
  if (!result) {
    if (!showEmptyState) return null;
    return (
      <Box
        role="status"
        aria-live="polite"
        bg="bg.subtle"
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="lg"
        p="4"
        w="full"
        maxW="md"
      >
        <Text color="fg.muted" fontSize="sm">
          Enter your postcode to check live dispatch availability.
        </Text>
      </Box>
    );
  }

  const c = copyFor(result);
  const fee = formatFee(result.callOutFeePence);

  return (
    <Box
      role="status"
      aria-live="polite"
      bg={c.toneBg}
      borderWidth="1px"
      borderColor={c.toneBorder}
      borderRadius="lg"
      p="4"
      w="full"
      maxW="md"
    >
      <Stack gap="3">
        <Box>
          <Text fontWeight="700" color="fg.default" fontSize="md">
            {c.headline}
          </Text>
          <Text color="fg.muted" fontSize="sm" mt="1">
            {c.body}
          </Text>
        </Box>
        {fee ? (
          <Text color="fg.muted" fontSize="xs">
            Call-out from {fee}. Final price confirmed by phone before dispatch.
          </Text>
        ) : null}
        <EmergencyCallActions source={source} suggestedAction={result.suggestedAction} />
      </Stack>
    </Box>
  );
}
