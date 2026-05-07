'use client';
import { useEffect, useState } from 'react';
import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import {
  isQuoteProgressExpired,
  loadQuoteProgress,
  type QuoteProgressSnapshot,
} from '@/lib/quote/progress-storage';

export interface RestoreQuotePromptProps {
  /** Called when the user accepts the saved progress. */
  onContinue: (snapshot: QuoteProgressSnapshot) => void;
  /** Called when the user rejects the saved progress. */
  onDiscard: () => void;
}

export function RestoreQuotePrompt({ onContinue, onDiscard }: RestoreQuotePromptProps) {
  const [snapshot, setSnapshot] = useState<QuoteProgressSnapshot | null>(null);

  useEffect(() => {
    const s = loadQuoteProgress();
    if (!s || isQuoteProgressExpired(s)) {
      setSnapshot(null);
      return;
    }
    setSnapshot(s);
  }, []);

  if (!snapshot) return null;

  const reg = snapshot.vehicle?.registration ?? null;
  const lines: string[] = [];
  if (reg) lines.push(`Vehicle ${reg}`);
  if (snapshot.tyreProblemType) lines.push(`Issue: ${snapshot.tyreProblemType.replace(/_/g, ' ').toLowerCase()}`);
  if (snapshot.location?.postcode) lines.push(`Location: ${snapshot.location.postcode}`);

  return (
    <Stack
      gap="3"
      p={{ base: '4', md: '5' }}
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.gold"
      bg="bg.surface"
    >
      <Stack gap="1">
        <Text fontFamily="heading" color="accent.neon" fontSize="lg">
          Pick up where you left off?
        </Text>
        <Text color="fg.muted" fontSize="sm">
          We saved your progress on this device.
        </Text>
        {lines.length > 0 ? (
          <Box mt="1">
            {lines.map((l) => (
              <Text key={l} color="fg.muted" fontSize="xs">
                {l}
              </Text>
            ))}
          </Box>
        ) : null}
      </Stack>
      <HStack gap="3" wrap="wrap">
        <GoldButton onClick={() => onContinue(snapshot)} variant="solid" size="sm">
          Continue
        </GoldButton>
        <GoldButton
          onClick={() => {
            setSnapshot(null);
            onDiscard();
          }}
          variant="ghost"
          size="sm"
        >
          Start again
        </GoldButton>
      </HStack>
    </Stack>
  );
}
