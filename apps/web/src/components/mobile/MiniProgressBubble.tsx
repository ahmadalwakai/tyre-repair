'use client';

import { Box, Drawer, HStack, Stack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { FiCheck, FiCircle } from 'react-icons/fi';
import { QUOTE_STEPS, STEP_META, type QuoteStep } from '@/lib/quote/steps';

export interface MiniProgressBubbleProps {
  current: QuoteStep;
}

/**
 * Floating "n/m" pill on mobile that, when tapped, opens a small bottom
 * sheet showing each step (done / current / remaining).
 *
 * Lives next to the existing top `<QuoteProgress>` strip. The strip stays
 * for desktop / accessibility; the bubble exists so customers don't lose
 * orientation while scrolled deep into a long step (e.g. tyre options).
 */
export function MiniProgressBubble({ current }: MiniProgressBubbleProps) {
  const [open, setOpen] = useState(false);
  const idx = QUOTE_STEPS.indexOf(current);
  const total = QUOTE_STEPS.length;
  const safeIdx = idx < 0 ? 0 : idx;

  return (
    <>
      <Box
        position="fixed"
        right={{ base: '4', md: '6' }}
        bottom={`calc(env(safe-area-inset-bottom, 0px) + 6.5rem)`}
        zIndex="34"
        display={{ base: 'block', md: 'none' }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Quote progress: step ${safeIdx + 1} of ${total}`}
          style={{
            all: 'unset',
            cursor: 'pointer',
            minWidth: '44px',
            minHeight: '44px',
            padding: '0 12px',
            borderRadius: '999px',
            background: 'rgba(20,20,20,0.94)',
            color: '#E30613',
            border: '1px solid #E30613',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          {safeIdx + 1}/{total}
        </button>
      </Box>

      <Drawer.Root
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
        placement="bottom"
        size="sm"
      >
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content
            bg="bg.canvas"
            borderTopWidth="2px"
            borderTopColor="border.gold"
            borderTopRadius="2xl"
            pb={`calc(env(safe-area-inset-bottom, 0px) + 1rem)`}
          >
            <Drawer.Header>
              <Drawer.Title color="accent.neon" fontFamily="heading">
                Your quote progress
              </Drawer.Title>
              <Drawer.CloseTrigger />
            </Drawer.Header>
            <Drawer.Body>
              <Stack gap="3">
                {QUOTE_STEPS.map((step, i) => {
                  const meta = STEP_META[step];
                  const done = i < safeIdx;
                  const isCurrent = i === safeIdx;
                  return (
                    <HStack
                      key={step}
                      gap="3"
                      px="3"
                      py="3"
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor={isCurrent ? 'border.gold' : 'border.subtle'}
                      bg={isCurrent ? 'bg.surface' : 'transparent'}
                    >
                      <Box
                        color={done ? 'accent.solid' : isCurrent ? 'accent.neon' : 'fg.muted'}
                        fontSize="lg"
                        aria-hidden
                      >
                        {done ? <FiCheck /> : <FiCircle />}
                      </Box>
                      <Stack gap="0" flex="1" minW="0">
                        <Text fontWeight="semibold" color="fg.default">
                          {meta.title}
                        </Text>
                        <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                          {done ? 'Done' : isCurrent ? 'Current step' : 'Coming up'}
                        </Text>
                      </Stack>
                    </HStack>
                  );
                })}
              </Stack>
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </>
  );
}
