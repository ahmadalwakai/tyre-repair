'use client';
import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';

export interface CheckoutErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function CheckoutErrorState({ title, message, onRetry }: CheckoutErrorStateProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      bg="bg.surface"
      p={{ base: '4', md: '6' }}
    >
      <Stack gap="4">
        <Text fontFamily="heading" color="accent.neon" fontSize="lg">
          {title ?? 'We hit a snag'}
        </Text>
        <Text color="fg.default">{message}</Text>
        <HStack gap="3" wrap="wrap">
          {onRetry ? (
            <GoldButton onClick={onRetry} variant="solid">
              Try again
            </GoldButton>
          ) : null}
          <GoldButton href={siteConfig.phoneHref} variant="outline">
            Call {siteConfig.phoneDisplay}
          </GoldButton>
        </HStack>
      </Stack>
    </Box>
  );
}
