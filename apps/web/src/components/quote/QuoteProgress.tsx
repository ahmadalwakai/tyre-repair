'use client';
import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import type { QuoteFlowStep } from '@/types/quote';

const STEPS: { key: QuoteFlowStep; label: string }[] = [
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'tyre', label: 'Tyres' },
  { key: 'location', label: 'Location' },
  { key: 'quote', label: 'Quote' },
];

export interface QuoteProgressProps {
  current: QuoteFlowStep;
}

export function QuoteProgress({ current }: QuoteProgressProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
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
      {STEPS.map((s, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <Flex key={s.key} align="center" gap="2" flex={{ md: '1' }} minW="0">
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
            >
              {i + 1}
            </Box>
            <Stack gap="0">
              <Text
                fontSize="sm"
                fontWeight="600"
                color={isActive ? 'accent.neon' : 'fg.default'}
              >
                {s.label}
              </Text>
            </Stack>
          </Flex>
        );
      })}
    </Flex>
  );
}
