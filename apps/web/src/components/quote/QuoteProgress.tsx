'use client';
import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import {
  QUOTE_STEPS,
  STEP_META,
  getStepIndex,
  type QuoteStep,
} from '@/lib/quote/steps';

export interface QuoteProgressProps {
  current: QuoteStep;
}

/**
 * Quote-flow stepper. Renders one pill per step in `QUOTE_STEPS`, with a
 * mobile-first horizontal layout. The list of steps and their labels are
 * sourced from `@/lib/quote/steps` — never hardcoded here.
 */
export function QuoteProgress({ current }: QuoteProgressProps) {
  const currentIndex = getStepIndex(current);
  return (
    <Flex
      as="nav"
      aria-label="Quote progress"
      gap={{ base: '2', md: '3' }}
      wrap="wrap"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.surface"
      p={{ base: '3', md: '4' }}
    >
      {QUOTE_STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        const meta = STEP_META[step];
        return (
          <Flex
            key={step}
            align="center"
            gap="2"
            flex={{ md: '1' }}
            minW="0"
            transition="opacity 0.2s ease"
            opacity={isActive || isDone ? 1 : 0.6}
            {...(isActive ? { 'aria-current': 'step' as const } : {})}
          >
            <Box
              w="7"
              h="7"
              borderRadius="full"
              borderWidth="1px"
              borderColor={isActive || isDone ? 'border.gold' : 'border.subtle'}
              bg={isActive ? 'accent.solid' : 'transparent'}
              color={isActive ? 'bg.canvas' : 'accent.neon'}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="700"
              fontSize="sm"
              flexShrink={0}
              transition="background 0.2s ease, color 0.2s ease"
              aria-hidden
            >
              {isDone ? '✓' : i + 1}
            </Box>
            <Stack gap="0">
              <Text
                fontSize="sm"
                fontWeight="600"
                color={isActive ? 'accent.neon' : 'fg.default'}
              >
                {meta.progressLabel}
              </Text>
            </Stack>
          </Flex>
        );
      })}
    </Flex>
  );
}
