'use client';

import { Box, HStack, Text } from '@chakra-ui/react';
import { motion, useReducedMotion } from 'framer-motion';
import { FiActivity } from 'react-icons/fi';
import type { ReactNode } from 'react';

/**
 * Live updates ticker. Truthful, evergreen copy only — no fake ETA,
 * no fake live counters, no fake reviews. Items are static facts about
 * the service so the line is safe even when offline.
 */
const TICKER_ITEMS: readonly string[] = [
  '24/7 emergency mobile tyre callout across Scotland',
  'Scotland-wide mobile fleet — vans and drivers come to you',
  'Repair-first assessment — honest, no upsell',
  'Every booking dispatched as an emergency — no date picker',
  'Mobile fitting at home, work or roadside',
  'Call 0141 266 0690 to speak to the duty team',
  'WhatsApp us a photo of the damage for fastest help',
] as const;

const MotionFlex = motion.create(HStack);

interface TickerRowProps {
  ariaHidden?: boolean;
}

function TickerRow({ ariaHidden }: TickerRowProps): ReactNode {
  return (
    <HStack
      gap="10"
      px="5"
      flexShrink={0}
      {...(ariaHidden ? { 'aria-hidden': true } : {})}
    >
      {TICKER_ITEMS.map((item, idx) => (
        <HStack key={`${item}-${idx}`} gap="3" flexShrink={0}>
          <Box
            w="6px"
            h="6px"
            borderRadius="full"
            bg="accent.solid"
            boxShadow="glowSoft"
            flexShrink={0}
            aria-hidden
          />
          <Text
            color="fg.default"
            fontSize={{ base: 'xs', md: 'sm' }}
            fontWeight="500"
            whiteSpace="nowrap"
            letterSpacing="0.02em"
          >
            {item}
          </Text>
        </HStack>
      ))}
    </HStack>
  );
}

export function LiveNewsTicker(): ReactNode {
  const reduce = useReducedMotion();

  return (
    <Box
      as="section"
      aria-label="Live service updates"
      role="region"
      bg="bg.surface"
      borderTopWidth="1px"
      borderBottomWidth="1px"
      borderColor="border.accent"
      position="relative"
      overflow="hidden"
    >
      <HStack gap="0" align="stretch">
        {/* Static "LIVE" badge pinned to the left, above the marquee. */}
        <HStack
          gap="2"
          px={{ base: '3', md: '4' }}
          py={{ base: '2', md: '2.5' }}
          bg="accent.solid"
          color="white"
          flexShrink={0}
          position="relative"
          zIndex={2}
          boxShadow="glowSoft"
        >
          <Box
            as={FiActivity}
            aria-hidden
            fontSize={{ base: 'sm', md: 'md' }}
          />
          <Text
            fontSize={{ base: '2xs', md: 'xs' }}
            fontWeight="700"
            letterSpacing="0.18em"
            textTransform="uppercase"
            lineHeight="1"
          >
            Live
          </Text>
        </HStack>

        {/* Scrolling marquee. Two identical rows + x: 0 → -50% gives a
            seamless infinite loop. Reduced-motion users see a static row. */}
        <Box
          position="relative"
          flex="1"
          overflow="hidden"
          py={{ base: '2', md: '2.5' }}
          /* Soft fade on both edges so text doesn't pop in/out abruptly. */
          style={{
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%)',
          }}
        >
          {reduce ? (
            <TickerRow />
          ) : (
            <MotionFlex
              gap="0"
              align="center"
              w="max-content"
              animate={{ x: ['0%', '-50%'] }}
              transition={{
                duration: 38,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <TickerRow />
              <TickerRow ariaHidden />
            </MotionFlex>
          )}
        </Box>
      </HStack>
    </Box>
  );
}

export default LiveNewsTicker;
