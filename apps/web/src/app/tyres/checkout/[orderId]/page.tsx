/**
 * Tyre Shop secure checkout page.
 *
 * The previous step (`/tyres`) created a pending booking row + Stripe
 * PaymentIntent and redirected the customer here with the clientSecret in
 * the URL. We mount the Stripe Payment Element keyed by that secret. On
 * success Stripe redirects to /track/[trackingId] (the existing post-pay
 * destination) where the existing webhook-driven status flow takes over.
 *
 * No DB writes happen in this page — order state is owned by the API
 * route. We deliberately accept the clientSecret from the URL: it is the
 * documented Stripe pattern and is not a customer secret on its own.
 */
import type { Metadata } from 'next';
import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { TyreShopCheckoutShell } from '@/components/tyre-shop/TyreShopCheckoutShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Secure tyre checkout — TyreRepair UK',
  description: 'Pay securely for your tyre order.',
};

interface PageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ cs?: string; tid?: string }>;
}

export default async function TyreCheckoutPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { cs, tid } = await searchParams;

  return (
    <Box bg="bg.canvas" color="fg.default" minH="100vh">
      <SiteHeader />
      <Container maxW="3xl" py={{ base: '8', md: '12' }}>
        <Stack gap="6">
          <Stack gap="2">
            <Heading
              as="h1"
              fontFamily="heading"
              color="accent.neon"
              size={{ base: 'xl', md: '2xl' }}
            >
              Secure tyre checkout
            </Heading>
            <Text color="fg.muted">
              Card payment is processed securely by Stripe. We never see your card details.
            </Text>
          </Stack>
          {cs && tid ? (
            <TyreShopCheckoutShell
              clientSecret={cs}
              trackingId={tid}
              bookingId={orderId}
            />
          ) : (
            <Box
              borderWidth="1px"
              borderColor="border.subtle"
              p="6"
              borderRadius="md"
              bg="bg.subtle"
            >
              <Text color="red.300">
                Checkout link is invalid or has expired. Please start a new order.
              </Text>
            </Box>
          )}
        </Stack>
      </Container>
      <SiteFooter />
    </Box>
  );
}
