'use client';
import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';

export interface RestoreQuotePromptProps {
  /** Resume the persisted state. */
  onResume: () => void;
  /** Discard the persisted state and start fresh. */
  onDiscard: () => void;
  /** When the persisted snapshot was last updated. Used for the
   * "saved Xm ago" caption. */
  savedAt: Date;
}

function formatRelative(savedAt: Date): string {
  const diffMs = Date.now() - savedAt.getTime();
  const diffMins = Math.max(0, Math.round(diffMs / 60_000));
  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  return 'over an hour ago';
}

/**
 * Top-of-page banner shown on /quote when a valid v2 progress snapshot is
 * found in localStorage. Fades in, mobile-first stacked layout, two CTAs.
 *
 * Visibility logic (whether to render at all) is owned by the parent —
 * this component is purely presentational.
 */
export function RestoreQuotePrompt({
  onResume,
  onDiscard,
  savedAt,
}: RestoreQuotePromptProps) {
  return (
    <Box
      role="region"
      aria-label="Resume previous quote"
      borderWidth="1px"
      borderColor="border.gold"
      borderRadius="md"
      bg="bg.surface"
      p={{ base: '4', md: '5' }}
      style={{ animation: 'fadeIn 0.3s ease' }}
    >
      <Stack gap="3">
        <Stack gap="1">
          <Text fontFamily="heading" color="accent.neon" fontSize="md">
            Pick up where you left off?
          </Text>
          <Text color="fg.muted" fontSize="sm">
            We saved your progress {formatRelative(savedAt)}. You can resume or
            start a new quote.
          </Text>
        </Stack>
        <HStack gap="3" wrap="wrap">
          <GoldButton variant="solid" onClick={onResume}>
            Continue where I left off
          </GoldButton>
          <GoldButton variant="ghost" onClick={onDiscard}>
            Start over
          </GoldButton>
        </HStack>
      </Stack>
    </Box>
  );
}
