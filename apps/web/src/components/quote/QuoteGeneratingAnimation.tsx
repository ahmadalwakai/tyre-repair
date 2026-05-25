'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, HStack, Stack, Text } from '@chakra-ui/react';

export interface QuoteGeneratingAnimationProps {
  /** Called once after all stages complete (or immediately when reduced motion). */
  onComplete: () => void;
}

interface Stage {
  label: string;
  /** ms from animation start at which this stage flips to "done". */
  doneAt: number;
}

const STAGES: Stage[] = [
  { label: 'Checking stock availability…', doneAt: 600 },
  { label: 'Calculating fitting price…', doneAt: 1200 },
  { label: 'Preparing your quote…', doneAt: 1800 },
];

const TOTAL_MS = 1800;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Short pre-quote animation. Renders three lines that slide in and tick off
 * over ~1.8s. Honours `prefers-reduced-motion` by skipping straight to the
 * completion callback with a single static line.
 */
export function QuoteGeneratingAnimation({ onComplete }: QuoteGeneratingAnimationProps) {
  const [doneCount, setDoneCount] = useState(0);
  const [reduced] = useState<boolean>(() => prefersReducedMotion());
  const finishedRef = useRef(false);

  useEffect(() => {
    if (reduced) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onComplete();
      }
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    STAGES.forEach((stage, i) => {
      timers.push(
        setTimeout(() => setDoneCount((c) => Math.max(c, i + 1)), stage.doneAt),
      );
    });
    timers.push(
      setTimeout(() => {
        if (!finishedRef.current) {
          finishedRef.current = true;
          onComplete();
        }
      }, TOTAL_MS + 50),
    );
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [reduced, onComplete]);

  if (reduced) {
    return (
      <Stack
        gap="3"
        p={{ base: '4', md: '5' }}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.subtle"
        bg="bg.surface"
        role="status"
        aria-live="polite"
      >
        <Text color="accent.neon" fontFamily="heading" fontSize="md">
          Preparing your quote…
        </Text>
      </Stack>
    );
  }

  return (
    <Stack
      gap="3"
      p={{ base: '4', md: '5' }}
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.surface"
      role="status"
      aria-live="polite"
    >
      {STAGES.map((stage, i) => {
        const isDone = i < doneCount;
        const isActive = i === doneCount;
        const visible = isDone || isActive;
        return (
          <HStack
            key={stage.label}
            gap="3"
            opacity={visible ? 1 : 0}
            transform={visible ? 'translateX(0)' : 'translateX(-8px)'}
            transition="opacity 0.25s ease, transform 0.25s ease"
          >
            <Box
              w="6"
              h="6"
              borderRadius="full"
              borderWidth="1px"
              borderColor={isDone ? 'border.gold' : 'border.subtle'}
              bg={isDone ? 'accent.solid' : 'transparent'}
              color={isDone ? 'bg.canvas' : 'accent.neon'}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="xs"
              fontWeight="700"
              transition="background 0.2s ease"
              aria-hidden
            >
              {isDone ? '✓' : ''}
            </Box>
            <Text color={isDone ? 'fg.default' : 'fg.muted'} fontSize="sm">
              {stage.label}
            </Text>
          </HStack>
        );
      })}
    </Stack>
  );
}
