'use client';
import { Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';

export interface QuoteEmptyStateProps {
  message: string;
}

export function QuoteEmptyState({ message }: QuoteEmptyStateProps) {
  return (
    <Stack
      gap="3"
      p="5"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.surface"
      align="flex-start"
    >
      <Text color="fg.muted">{message}</Text>
      <GoldButton href={siteConfig.phoneHref} variant="outline" size="sm">
        {siteConfig.secondaryCtaLabel}
      </GoldButton>
    </Stack>
  );
}
