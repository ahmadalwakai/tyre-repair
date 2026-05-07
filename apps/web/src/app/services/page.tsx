import type { Metadata } from 'next';
import { Box, Container, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';
import { Breadcrumb } from '@/components/locations/LocationHero';
import { ServiceCta } from '@/components/services/ServiceCta';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { servicePages } from '@/lib/seo/service-pages';

export const metadata: Metadata = buildSeoMetadata({
  title: 'Mobile Tyre Services Across Scotland | TyreRepair UK',
  description:
    'Mobile tyre fitting, emergency tyre repair, puncture repair and 24/7 tyre help across Scotland from a Glasgow base. Browse all services.',
  path: '/services',
});

export default function ServicesIndexPage() {
  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'Services', href: '/services' },
  ];
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
              <Heading as="h1" fontFamily="heading" fontSize={{ base: '3xl', md: '5xl' }} color="fg.default">
                Mobile tyre services across Scotland
              </Heading>
              <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="3xl">
                Mobile tyre fitting, emergency repair, puncture repair, run flats, van and 4x4 tyres,
                winter tyres and budget options — all from a Glasgow base, dispatched to you.
              </Text>
            </Stack>
          </Container>
        </Box>
        <Box bg="bg.surface" px={{ base: '4', md: '6' }} py={{ base: '10', md: '14' }}>
          <Container maxW="5xl">
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
              {servicePages.map((s) => (
                <NextLink key={s.slug} href={`/services/${s.slug}`} prefetch={false}>
                  <Box
                    borderWidth="1px"
                    borderColor="border.subtle"
                    borderRadius="lg"
                    p="5"
                    h="100%"
                    _hover={{ borderColor: 'border.gold' }}
                    transition="border-color 120ms"
                  >
                    <Stack gap="2">
                      <Text color="accent.neon" fontWeight="700" fontSize="md">
                        {s.title}
                      </Text>
                      <Text color="fg.muted" fontSize="sm" lineHeight="1.6">
                        {s.heroIntro}
                      </Text>
                    </Stack>
                  </Box>
                </NextLink>
              ))}
            </SimpleGrid>
          </Container>
        </Box>
        <ServiceCta ctaLabel="Get Instant Emergency Quote" ctaHref="/quote" />
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
