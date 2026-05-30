import type { Metadata } from 'next';
import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';
import { Breadcrumb } from '@/components/locations/LocationHero';
import { ServiceCta } from '@/components/services/ServiceCta';
import { LocationPageLinks } from '@/components/seo/LocationPageLinks';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { getLocationPagesByPriority } from '@/lib/seo/location-pages';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = buildSeoMetadata({
  title: 'Scotland-Wide Mobile Tyre Coverage | TyreRepair UK',
  description:
    'Scotland-wide mobile tyre fitting and emergency tyre repair. Vans dispatched across the central belt, Lothians, Fife, Stirling, Lanarkshire, Ayrshire, Highlands and Borders.',
  path: '/coverage',
});

export default function CoveragePage() {
  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'Coverage', href: '/coverage' },
  ];
  const p1 = getLocationPagesByPriority(1);
  const p2 = getLocationPagesByPriority(2);
  return (
    <>
      <LocalBusinessJsonLd />
      <BreadcrumbJsonLd items={breadcrumb} />
      <SiteHeader />
      <Box as="main">
        <Breadcrumb items={breadcrumb} />
        <Box bg="bg.canvas" px={{ base: '4', md: '6' }} py={{ base: '12', md: '16' }}>
          <Container maxW="5xl">
            <Stack gap="5">
              <Heading
                as="h1"
                fontFamily="heading"
                fontSize={{ base: '3xl', md: '5xl' }}
                color="fg.default"
                lineHeight="1.25"
                letterSpacing="0.01em"
              >
                Scotland-wide mobile tyre coverage
              </Heading>
              <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="3xl" lineHeight="1.7">
                {siteConfig.businessName} runs a mobile fleet of vans and drivers covering the whole
                of Scotland — we come to you. Central belt, Lothians, Fife, Stirling, Lanarkshire,
                Renfrewshire and Ayrshire are routine same-day cover. Highland, Borders and island
                jobs are quoted with honest travel times, never a guess.
              </Text>
              <Text color="fg.muted" fontSize="sm">
                No fake city branches. Real vans, real drivers, dispatched to your location anywhere
                in Scotland — 24 hours a day, 7 days a week.
              </Text>
            </Stack>
          </Container>
        </Box>

        <Box bg="bg.surface" px={{ base: '4', md: '6' }} py={{ base: '10', md: '14' }}>
          <Container maxW="6xl">
            <Stack gap="10">
              <LocationPageLinks title="Major Scottish cities and towns" pages={p1} />
              <LocationPageLinks title="Standard cover towns" pages={p2} />
            </Stack>
          </Container>
        </Box>

        <ServiceCta ctaLabel="Check my location" ctaHref="/quote" variant="location" />
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
