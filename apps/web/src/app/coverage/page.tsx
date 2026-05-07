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
  title: 'Coverage Across Scotland | Mobile Tyre Fitting',
  description:
    'A Glasgow base covering Scotland for mobile tyre fitting and emergency tyre repair. Honest travel-time quotes, no fake city branches.',
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
                Coverage across Scotland from a Glasgow base
              </Heading>
              <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="3xl" lineHeight="1.7">
                {siteConfig.businessName} operates from {siteConfig.address}. Cover is mobile across
                Scotland — we travel to the customer, we do not run regional branches. Travel time
                from Glasgow is real and we are honest about it before you commit.
              </Text>
              <Text color="fg.muted" fontSize="sm">
                Central belt and Lothians are routine cover. Highland, Borders and island work is
                quoted with realistic travel time and never with a promised arrival window we cannot
                guarantee.
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
