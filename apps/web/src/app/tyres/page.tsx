/**
 * Tyre Shop public landing page (server component).
 *
 * Lists tyres from the catalog and hands the customer to the wizard. The
 * wizard runs entirely in the browser and posts to /api/tyre-shop/* — we
 * keep this page server-rendered so SEO + initial paint are fast.
 *
 * SEO-only metadata is added inline. We deliberately do not use a quote-
 * style flow here; this is a straight retail experience.
 */
import type { Metadata } from 'next';
import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { TyreShopClient } from '@/components/tyre-shop/TyreShopClient';
import { listTyreShopItems, listDistinctSizes, listDistinctBrands } from '@/lib/tyre-shop/catalog';
import { getTyreShopFees } from '@/lib/tyre-shop/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Buy tyres online — TyreRepair UK',
  description:
    'Order new tyres for garage or home fitting. Pay securely online. Out of stock? Backorder fitted within 3 working days.',
};

export default async function TyresPage() {
  const [items, sizes, brands, fees] = await Promise.all([
    listTyreShopItems({ inStockOnly: false }),
    listDistinctSizes(),
    listDistinctBrands(),
    getTyreShopFees(),
  ]);

  return (
    <Box bg="bg.canvas" color="fg.default" minH="100vh">
      <SiteHeader />
      <Container maxW="6xl" py={{ base: '8', md: '12' }}>
        <Stack gap="8">
          <Stack gap="2">
            <Heading
              as="h1"
              fontFamily="heading"
              color="accent.neon"
              size={{ base: 'xl', md: '2xl' }}
            >
              Buy tyres online
            </Heading>
            <Text color="fg.muted" maxW="3xl">
              Pick your size and brand, choose garage or home fitting, then pay securely.
              Out of stock items are fitted within {fees.backorderEtaWorkingDays} working days.
            </Text>
          </Stack>
          <TyreShopClient
            initialItems={items}
            sizes={sizes}
            brands={brands}
            backorderEtaWorkingDays={fees.backorderEtaWorkingDays}
            maxHomeFittingMiles={fees.maxHomeFittingMiles}
            fittingFeeGarageGbp={fees.fittingFeeGarageGbp}
            fittingFeeHomeGbp={fees.fittingFeeHomeGbp}
          />
        </Stack>
      </Container>
      <SiteFooter />
    </Box>
  );
}
