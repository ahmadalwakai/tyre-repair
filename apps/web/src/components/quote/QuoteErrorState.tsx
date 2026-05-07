'use client';
import { Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';

export interface QuoteErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function QuoteErrorState({ message, onRetry, retryLabel = 'Try again' }: QuoteErrorStateProps) {
  return (
    <Stack
      gap="3"
      p="5"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.gold"
      bg="bg.surface"
    >
      <Text color="fg.default" fontWeight="600">
        {message}
      </Text>
      <Stack direction={{ base: 'column', sm: 'row' }} gap="3">
        {onRetry && (
          <GoldButton onClick={onRetry} variant="outline">
            {retryLabel}
          </GoldButton>
        )}
        <GoldButton href={siteConfig.phoneHref} variant="ghost">
          {siteConfig.secondaryCtaLabel}
        </GoldButton>
      </Stack>
    </Stack>
  );
}
