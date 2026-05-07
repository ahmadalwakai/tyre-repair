'use client';
import { useEffect, useState } from 'react';
import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';

const SESSION_KEY = 'tyrerepair:exit-intent:shown:v1';
const INACTIVITY_MS = 45 * 1000;

export interface QuoteExitIntentPromptProps {
  /** When true the prompt will never show (e.g. after checkout or success). */
  disabled?: boolean;
  /** Called when user clicks "Send me my quote later" — we open the call-back form. */
  onWantsCallback?: () => void;
}

function hasShownThisSession(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return true;
  }
}

function markShown(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // ignore
  }
}

export function QuoteExitIntentPrompt({ disabled, onWantsCallback }: QuoteExitIntentPromptProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled) return;
    if (hasShownThisSession()) return;

    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(max-width: 767px)').matches;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let resetActivity: (() => void) | null = null;
    let onMouseLeave: ((e: MouseEvent) => void) | null = null;

    const trigger = () => {
      if (hasShownThisSession()) return;
      markShown();
      setOpen(true);
    };

    if (isMobile) {
      const arm = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(trigger, INACTIVITY_MS);
      };
      resetActivity = arm;
      arm();
      window.addEventListener('scroll', arm, { passive: true });
      window.addEventListener('touchstart', arm, { passive: true });
      window.addEventListener('keydown', arm);
    } else {
      onMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) trigger();
      };
      document.addEventListener('mouseleave', onMouseLeave);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (resetActivity) {
        window.removeEventListener('scroll', resetActivity);
        window.removeEventListener('touchstart', resetActivity);
        window.removeEventListener('keydown', resetActivity);
      }
      if (onMouseLeave) document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [disabled]);

  if (!open) return null;

  return (
    <Box
      position="fixed"
      inset="0"
      zIndex="overlay"
      bg="rgba(0,0,0,0.65)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p="4"
      onClick={() => setOpen(false)}
    >
      <Stack
        onClick={(e) => e.stopPropagation()}
        gap="3"
        maxW="md"
        w="100%"
        p={{ base: '5', md: '6' }}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.gold"
        bg="bg.surface"
      >
        <Text fontFamily="heading" color="accent.neon" fontSize="xl">
          Wait — need a hand?
        </Text>
        <Text color="fg.muted" fontSize="sm">
          We can call you back to finish your emergency tyre quote. No commitment.
        </Text>
        <HStack gap="3" wrap="wrap">
          <GoldButton
            onClick={() => {
              setOpen(false);
              onWantsCallback?.();
            }}
            variant="solid"
            size="sm"
          >
            Request a call back
          </GoldButton>
          <GoldButton onClick={() => setOpen(false)} variant="ghost" size="sm">
            Keep going
          </GoldButton>
        </HStack>
      </Stack>
    </Box>
  );
}
