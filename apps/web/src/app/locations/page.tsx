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

export const metadata: Metadata = buildSeoMetadata({
  title: 'Mobile Tyre Fitting Locations Across Scotland | TyreRepair UK',
  description:
    'Browse mobile tyre fitting locations across Scotland — Glasgow, Edinburgh, Aberdeen, Dundee, Inverness and 350+ more towns covered from our Glasgow base.',
  path: '/locations',
});

export default function LocationsIndexPage() {
  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'Locations', href: '/locations' },
  ];
  const p1 = getLocationPagesByPriority(1);
  const p2 = getLocationPagesByPriority(2);
  const p3 = getLocationPagesByPriority(3);
  return (
    <>
      <LocalBusinessJsonLd />
      <BreadcrumbJsonLd items={breadcrumb} />
      <SiteHeader />
      <Box as="main">
        <Breadcrumb items={breadcrumb} />
        <Box bg="bg.canvas" px={{ base: '4', md: '6' }} py={{ base: '12', md: '16' }}>
          <Container maxW="5xl">
            <Stack gap="4">
              <Heading as="h1" fontFamily="heading" fontSize={{ base: '3xl', md: '5xl' }} color="fg.default">
                Mobile tyre fitting locations across Scotland
              </Heading>
              <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="3xl" lineHeight="1.7">
                Pick the closest location to you. Every page is mobile cover from our Glasgow base —
                we never run a fake branch and we are always honest about travel times.
              </Text>
            </Stack>
          </Container>
        </Box>
        <Box bg="bg.surface" px={{ base: '4', md: '6' }} py={{ base: '10', md: '14' }}>
          <Container maxW="6xl">
            <Stack gap="12">
              <LocationPageLinks title="Major cities" pages={p1} />
              <LocationPageLinks title="Standard cover towns" pages={p2} />
              <LocationPageLinks title="Wider Scottish coverage" pages={p3} />
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
