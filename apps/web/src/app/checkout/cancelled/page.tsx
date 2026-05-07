import type { Metadata } from 'next';
import { Box, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Payment cancelled | TyreRepair UK',
  robots: { index: false, follow: false },
};

export default function CheckoutCancelledPage() {
  return (
    <>
      <SiteHeader />
      <Box as="main" py={{ base: '12', md: '16' }} bg="bg.canvas">
        <Container maxW="2xl">
          <Stack gap="6">
            <Heading as="h1" color="accent.neon" fontFamily="heading">
              Payment was not completed.
            </Heading>
            <Text color="fg.muted">
              No charge has been taken. You can return to your quote and try again,
              or call us directly for emergency assistance.
            </Text>
            <HStack gap="3" wrap="wrap">
              <GoldButton href="/quote" variant="solid">
                Return to quote
              </GoldButton>
              <GoldButton
                href={siteConfig.phoneHref}
                variant="outline"
                callTrackingSource="CHECKOUT_CANCELLED_CALL"
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
