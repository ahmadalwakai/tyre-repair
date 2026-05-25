'use client';

import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';

const DISMISS_KEY = 'tyrerepair:call-instead-dismissed:v1';
const IDLE_THRESHOLD_MS = 50_000; // ~50 seconds of no interaction

/**
 * Gentle "Stuck? Call us" prompt for the quote flow.
 *
 * Triggers when the user has had no meaningful interaction for ~50s while
 * inside /quote. Dismissible for the rest of the tab session.
 *
 * This NEVER blocks the form — it slides in as a non-modal banner above the
 * sticky CTA bar.
 */
export function CallInsteadPrompt({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(DISMISS_KEY) === '1') {
      dismissedRef.current = true;
      return;
    }

    let timer: number | null = null;
    function reset() {
      if (dismissedRef.current) return;
      if (timer != null) window.clearTimeout(timer);
      // Hide if visible — user is interacting again, that's good.
      setVisible(false);
      timer = window.setTimeout(() => {
        if (!dismissedRef.current) setVisible(true);
      }, IDLE_THRESHOLD_MS);
    }

    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'scroll',
      'touchstart',
    ];
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();

    return () => {
      if (timer != null) window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [enabled]);

  if (!enabled || !visible) return null;

  function dismiss() {
    dismissedRef.current = true;
    setVisible(false);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(DISMISS_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <Box
      position="fixed"
      left="0"
      right="0"
      // Sit above the existing StickyQuoteActions (~88px) on mobile.
      bottom={`calc(env(safe-area-inset-bottom, 0px) + 6.5rem)`}
      px="3"
      zIndex="36"
      display={{ base: 'block', md: 'none' }}
      pointerEvents="none"
    >
      <Stack
        gap="3"
        px="4"
        py="3"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.gold"
        bg="bg.surface"
        boxShadow="glowSoft"
        pointerEvents="auto"
        maxW="lg"
        mx="auto"
      >
        <Text fontSize="sm" color="fg.default" fontWeight="semibold">
          Stuck? Call us and we&apos;ll finish this with you.
        </Text>
        <HStack gap="2" wrap="wrap">
          <GoldButton
            href={siteConfig.phoneHref}
            callTrackingSource="CallInsteadPrompt.call"
            size="sm"
          >
            Call now
          </GoldButton>
          <GoldButton variant="ghost" size="sm" onClick={dismiss}>
            Continue quote
          </GoldButton>
        </HStack>
      </Stack>
    </Box>
  );
}
