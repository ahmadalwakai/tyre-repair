'use client';
import { useEffect } from 'react';
import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';

export interface QuoteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function QuoteError({ error, reset }: QuoteErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Quote flow error', error);
    }
  }, [error]);

  return (
    <Box as="section" py="16" bg="bg.canvas">
      <Container maxW="2xl">
        <Stack gap="4">
          <Heading as="h1" color="accent.neon" fontFamily="heading">
            We hit a snag building your quote
          </Heading>
          <Text color="fg.muted">
            Please try again, or call us and we&apos;ll handle the quote on the phone.
          </Text>
          <Stack direction={{ base: 'column', sm: 'row' }} gap="3">
            <GoldButton onClick={reset} variant="solid">
              Try again
            </GoldButton>
            <GoldButton href={siteConfig.phoneHref} variant="outline">
              {siteConfig.secondaryCtaLabel}
            </GoldButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
