'use client';

import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { FiHelpCircle } from 'react-icons/fi';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';
import { HelpMeChooseSheet } from './HelpMeChooseSheet';

/**
 * Pair of small affordances to render at the top of the tyre selection step:
 *   1. "Not sure what I need?" — opens the HelpMeChoose sheet.
 *   2. "I don't know my tyre size" — collapses to a short reassurance with
 *      a Call CTA. We do NOT mutate the QuoteFlow reducer because the
 *      replacement-tyre flow currently requires a real tyre selection; an
 *      assessment-only public submission would need API + reducer work that
 *      is out of scope for this UX pack.
 */
export function NoTyreSizeShortcut() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [showNoSize, setShowNoSize] = useState(false);

  return (
    <Stack gap="3">
      <HStack gap="2" wrap="wrap">
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="Not sure what I need?"
          style={{
            all: 'unset',
            cursor: 'pointer',
            minHeight: '40px',
            padding: '8px 14px',
            borderRadius: '999px',
            border: '1px solid rgba(212,175,55,0.5)',
            color: '#FFD700',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Box as="span" aria-hidden>
            <FiHelpCircle />
          </Box>
          Not sure what I need?
        </button>
        <button
          type="button"
          onClick={() => setShowNoSize((v) => !v)}
          aria-pressed={showNoSize}
          aria-label="I don't know my tyre size"
          style={{
            all: 'unset',
            cursor: 'pointer',
            minHeight: '40px',
            padding: '8px 14px',
            borderRadius: '999px',
            border: '1px solid rgba(212,175,55,0.5)',
            color: '#F5F5F5',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          I don&apos;t know my tyre size
        </button>
      </HStack>

      {showNoSize && (
        <Stack
          gap="3"
          p="4"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="border.gold"
          bg="bg.surface"
        >
          <Text color="fg.default" fontSize="sm">
            No problem. We can check the tyre size when we arrive or confirm it by phone.
          </Text>
          <HStack gap="2" wrap="wrap">
            <GoldButton
              href={siteConfig.phoneHref}
              callTrackingSource="NoTyreSizeShortcut.call"
              size="sm"
            >
              Call us
            </GoldButton>
            <GoldButton variant="ghost" size="sm" onClick={() => setShowNoSize(false)}>
              I&apos;ll find it
            </GoldButton>
          </HStack>
        </Stack>
      )}

      <HelpMeChooseSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </Stack>
  );
}
