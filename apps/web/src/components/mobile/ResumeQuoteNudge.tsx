'use client';

import { Box, HStack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { FiClock, FiX } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { loadQuoteProgress, clearQuoteProgress } from '@/lib/quote/progress-storage';

const DISMISS_KEY = 'tyrerepair:resume-nudge-dismissed:v1';

function formatRelative(updatedAt: number): string {
  const mins = Math.max(1, Math.round((Date.now() - updatedAt) / 60_000));
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
}

/**
 * Compact pill that nudges the customer to resume a saved quote.
 *
 * Suppression rules:
 *   - Only shows on routes where it makes sense (parent decides via `enabled`).
 *   - Hidden if there is no meaningful saved progress (must have an address).
 *   - Hidden after dismissal for the rest of the tab session.
 */
export function ResumeQuoteNudge({ enabled }: { enabled: boolean }) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(true); // start hidden, only show after mount check

  useEffect(() => {
    if (!enabled) {
      setSavedAt(null);
      return;
    }
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(DISMISS_KEY) === '1') {
      setDismissed(true);
      return;
    }
    const snap = loadQuoteProgress();
    if (snap && snap.address) {
      setSavedAt(snap.updatedAt);
      setDismissed(false);
    }
  }, [enabled]);

  if (!enabled || dismissed || savedAt == null) return null;

  function dismiss() {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(DISMISS_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }

  function startAgain() {
    clearQuoteProgress();
    dismiss();
  }

  return (
    <Box
      position="fixed"
      left="0"
      right="0"
      bottom={`calc(env(safe-area-inset-bottom, 0px) + 5.25rem)`}
      px="4"
      zIndex="35"
      display={{ base: 'block', md: 'none' }}
      pointerEvents="none"
    >
      <HStack
        gap="3"
        px="3"
        py="2"
        borderRadius="full"
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border.gold"
        boxShadow="glowSoft"
        pointerEvents="auto"
        maxW="md"
        mx="auto"
      >
        <Box color="accent.neon" fontSize="lg" aria-hidden>
          <FiClock />
        </Box>
        <NextLink
          href="/quote"
          style={{ flex: 1, display: 'block' }}
          aria-label="Continue your emergency quote"
          onClick={dismiss}
        >
          <Text fontSize="sm" color="fg.default" fontWeight="semibold" lineClamp={1}>
            Continue your emergency quote
          </Text>
          <Text fontSize="xs" color="fg.muted" lineClamp={1}>
            Saved {formatRelative(savedAt)}
          </Text>
        </NextLink>
        <button
          type="button"
          onClick={startAgain}
          aria-label="Dismiss saved quote"
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '8px',
            display: 'inline-flex',
            color: 'inherit',
          }}
        >
          <FiX />
        </button>
      </HStack>
    </Box>
  );
}
