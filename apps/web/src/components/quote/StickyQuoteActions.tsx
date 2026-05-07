'use client';
import { Box, HStack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';

export interface StickyQuoteActionsProps {
  /** Primary CTA text. */
  primaryLabel: string;
  /** Primary CTA handler. When undefined, the button is disabled. */
  onPrimary?: (() => void) | undefined;
  /** Optional small caption shown above the buttons (e.g. "Step 2 of 4"). */
  caption?: string | undefined;
  /** Optional secondary action (e.g. "Call us"). */
  secondaryLabel?: string | undefined;
  onSecondary?: (() => void) | undefined;
  /** Hide on desktop. Defaults to true (mobile-only sticky CTA). */
  mobileOnly?: boolean;
}

export function StickyQuoteActions({
  primaryLabel,
  onPrimary,
  caption,
  secondaryLabel,
  onSecondary,
  mobileOnly = true,
}: StickyQuoteActionsProps) {
  return (
    <Box
      position="fixed"
      bottom="0"
      left="0"
      right="0"
      zIndex="sticky"
      bg="bg.surface"
      borderTopWidth="1px"
      borderColor="border.gold"
      px={{ base: '4', md: '6' }}
      py="3"
      boxShadow="0 -4px 18px rgba(0,0,0,0.45)"
      display={mobileOnly ? { base: 'block', md: 'none' } : 'block'}
    >
      {caption ? (
        <Text color="fg.muted" fontSize="xs" mb="1">
          {caption}
        </Text>
      ) : null}
      <HStack gap="3">
        <GoldButton
          {...(onPrimary ? { onClick: onPrimary } : {})}
          variant="solid"
          fullWidth
          disabled={!onPrimary}
        >
          {primaryLabel}
        </GoldButton>
        {secondaryLabel && onSecondary ? (
          <GoldButton onClick={onSecondary} variant="outline">
            {secondaryLabel}
          </GoldButton>
        ) : null}
      </HStack>
    </Box>
  );
}
