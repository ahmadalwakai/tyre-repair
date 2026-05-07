'use client';
import { Box, Container, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import { useEffect } from 'react';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';

export interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (typeof console !== 'undefined') {
      console.error('[app/error]', error.message, error.digest ?? '');
    }
  }, [error]);

  return (
    <Box
      as="main"
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="bg.canvas"
      px={{ base: '4', md: '6' }}
      py="20"
    >
      <Container maxW="2xl">
        <Stack gap="6" align="center" textAlign="center">
          <Text
            color="accent.neon"
            fontSize="sm"
            letterSpacing="0.18em"
            textTransform="uppercase"
            fontWeight="700"
          >
            Error
          </Text>
          <Heading
            as="h1"
            fontFamily="heading"
            fontSize={{ base: '3xl', md: '5xl' }}
            color="fg.default"
          >
            Something went wrong.
          </Heading>
          <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }}>
            Please try again. If the issue persists, call us directly for emergency tyre help.
          </Text>
          <Flex gap="3" wrap="wrap" justify="center">
            <GoldButton onClick={reset} size="lg">
              Try again
            </GoldButton>
            <GoldButton
              href={siteConfig.phoneHref}
              variant="outline"
              size="lg"
              callTrackingSource="ERROR_PAGE_CALL"
            >
              {siteConfig.secondaryCtaLabel}
            </GoldButton>
          </Flex>
        </Stack>
      </Container>
    </Box>
  );
}
