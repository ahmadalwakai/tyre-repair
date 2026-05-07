'use client';
import { Box, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';

export interface TrackingErrorStateProps {
  title?: string;
  message: string;
}

export function TrackingErrorState({ title, message }: TrackingErrorStateProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      bg="bg.surface"
      p={{ base: '4', md: '6' }}
    >
      <Stack gap="4">
        <Heading as="h1" fontFamily="heading" color="accent.neon" fontSize="xl">
          {title ?? 'Tracking unavailable'}
        </Heading>
        <Text color="fg.default">{message}</Text>
        <HStack gap="3" wrap="wrap">
          <GoldButton href={siteConfig.phoneHref} variant="solid">
            {siteConfig.secondaryCtaLabel}
          </GoldButton>
          <GoldButton href={siteConfig.whatsappHref} variant="outline">
            {siteConfig.whatsappCtaLabel}
          </GoldButton>
        </HStack>
      </Stack>
    </Box>
  );
}
