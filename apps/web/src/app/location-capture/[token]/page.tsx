import type { Metadata } from 'next';
import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { GoldButton } from '@/components/ui/GoldButton';
import { verifyLocationCaptureToken } from '@/lib/security/location-token';
import { LocationCaptureClient } from './LocationCaptureClient';

export const metadata: Metadata = {
  title: 'Share your location | TyreRepair UK',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function LocationCapturePage({ params }: PageProps) {
  const { token } = await params;
  const verify = await verifyLocationCaptureToken(token);

  return (
    <>
      <SiteHeader />
      <Box as="main" py={{ base: '8', md: '12' }} bg="bg.canvas">
        <Container maxW="lg">
          <Stack
            gap="5"
            p={{ base: '4', md: '6' }}
            borderRadius="lg"
            borderWidth="1px"
            borderColor="border.gold"
            bg="bg.surface"
          >
            <Heading as="h1" color="accent.neon" fontFamily="heading" fontSize="2xl">
              Share your location
            </Heading>
            {verify.ok ? (
              <>
                <Text color="fg.muted">
                  Tap the button below to share your location with TyreRepair UK so we can
                  dispatch the nearest mobile fitter. We never ask for a date or time.
                </Text>
                <LocationCaptureClient token={token} />
              </>
            ) : (
              <>
                <Text color="fg.muted">
                  {verify.reason === 'expired'
                    ? 'This link has expired. Please request a new one.'
                    : 'This link is invalid. Please request a new one.'}
                </Text>
                <GoldButton href="/quote" variant="solid">
                  Back to quote
                </GoldButton>
              </>
            )}
          </Stack>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
