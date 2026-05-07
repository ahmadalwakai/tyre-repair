import type { Metadata } from 'next';
import { Box, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';
import { getBookingByTrackingId } from '@/lib/bookings/tracking';
import { trackingIdSchema } from '@/lib/validation/checkout';
import { ClearQuoteProgressOnMount } from '@/components/quote/ClearQuoteProgressOnMount';

export const metadata: Metadata = {
  title: 'Payment received | TyreRepair UK',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ trackingId?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawTracking = typeof params.trackingId === 'string' ? params.trackingId : '';
  const parsed = trackingIdSchema.safeParse(rawTracking);

  let confirmed = false;
  let trackingId: string | null = null;
  if (parsed.success) {
    trackingId = parsed.data;
    const booking = await getBookingByTrackingId(parsed.data);
    if (booking && booking.status === 'confirmed') confirmed = true;
  }

  const headline = confirmed
    ? 'Your emergency booking is confirmed.'
    : 'Your payment is being confirmed. Your tracking page will update shortly.';

  return (
    <>
      <SiteHeader />
      <ClearQuoteProgressOnMount />
      <Box as="main" py={{ base: '12', md: '16' }} bg="bg.canvas">
        <Container maxW="2xl">
          <Stack gap="6">
            <Heading as="h1" color="accent.neon" fontFamily="heading">
              Payment confirmation received
            </Heading>
            <Text color="fg.default" fontSize="lg">
              {headline}
            </Text>
            {trackingId && (
              <Text color="fg.muted">
                Tracking reference: <strong>{trackingId}</strong>
              </Text>
            )}
            <HStack gap="3" wrap="wrap">
              {trackingId ? (
                <GoldButton href={`/track/${trackingId}`} variant="solid">
                  Track your booking
                </GoldButton>
              ) : (
                <GoldButton href="/quote" variant="solid">
                  Start new quote
                </GoldButton>
              )}
              <GoldButton
                href={siteConfig.phoneHref}
                variant="outline"
                callTrackingSource="CHECKOUT_SUCCESS_CALL"
              >
                {siteConfig.secondaryCtaLabel}
              </GoldButton>
            </HStack>
          </Stack>
        </Container>
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
