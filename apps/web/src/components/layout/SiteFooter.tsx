import { Box, Container, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { siteConfig } from '@/lib/site-config';
import type { LandingNavItem } from '@/types/landing';
import { TrackedPhoneLink } from '@/components/tracking/TrackedPhoneLink';
import { buildWhatsappHref } from '@/lib/contact/whatsapp-message';

const NAV: readonly LandingNavItem[] = [
  { label: 'Services', href: '/services' },
  { label: 'Coverage', href: '/coverage' },
  { label: 'Locations', href: '/locations' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Get Quote', href: '/quote' },
];

const COMPANY_FOOTER: readonly LandingNavItem[] = [
  { label: 'About us', href: '/about' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Contact', href: '/contact' },
  { label: 'FAQ', href: '/faq' },
];

const SERVICES_FOOTER: readonly LandingNavItem[] = [
  { label: 'Mobile tyre fitting', href: '/services/mobile-tyre-fitting' },
  { label: 'Emergency tyre repair', href: '/services/emergency-tyre-repair' },
  { label: '24 hour mobile tyre fitting', href: '/services/24-hour-mobile-tyre-fitting' },
  { label: 'Puncture repair', href: '/services/puncture-repair' },
  { label: 'Roadside tyre fitting', href: '/services/roadside-tyre-fitting' },
  { label: 'Run flat tyres', href: '/services/run-flat-tyres' },
  { label: 'Van tyres', href: '/services/van-tyres' },
];

const LOCATIONS_FOOTER: readonly LandingNavItem[] = [
  { label: 'Glasgow', href: '/locations/glasgow' },
  { label: 'Edinburgh', href: '/locations/edinburgh' },
  { label: 'Aberdeen', href: '/locations/aberdeen' },
  { label: 'Dundee', href: '/locations/dundee' },
  { label: 'Inverness', href: '/locations/inverness' },
  { label: 'Paisley', href: '/locations/paisley' },
  { label: 'Falkirk', href: '/locations/falkirk' },
];

const LEGAL: readonly LandingNavItem[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Cancellation Policy', href: '/cancellation-policy' },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <Box
      as="footer"
      borderTopWidth="1px"
      borderColor="border.gold"
      bg="bg.surface"
      mt="0"
      py={{ base: '12', md: '16' }}
      px={{ base: '4', md: '6' }}
    >
      <Container maxW="7xl">
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 7 }} gap={{ base: '8', md: '10' }}>
          <Stack gap="3">
            <Text fontFamily="heading" color="accent.neon" fontSize="xl">
              {siteConfig.businessName}
            </Text>
            <Text color="fg.muted" fontSize="sm">
              Scotland-wide mobile tyre repair and replacement.
            </Text>
            <Text color="fg.muted" fontSize="sm">
              {siteConfig.address}
            </Text>
          </Stack>

          <Stack gap="2">
            <Text color="fg.default" fontWeight="700" fontSize="sm" textTransform="uppercase" letterSpacing="0.14em">
              Contact
            </Text>
            <TrackedPhoneLink href={siteConfig.phoneHref} sourceComponent="SiteFooter">
              <Text color="fg.muted" fontSize="sm" _hover={{ color: 'accent.neon' }}>
                Phone: {siteConfig.phoneDisplay}
              </Text>
            </TrackedPhoneLink>
            <a href={buildWhatsappHref()} target="_blank" rel="noopener noreferrer">
              <Text color="fg.muted" fontSize="sm" _hover={{ color: 'accent.neon' }}>
                WhatsApp: {siteConfig.whatsappDisplay}
              </Text>
            </a>
          </Stack>

          <Stack gap="2">
            <Text color="fg.default" fontWeight="700" fontSize="sm" textTransform="uppercase" letterSpacing="0.14em">
              Site
            </Text>
            {NAV.map((item) => (
              <NextLink key={item.href} href={item.href}>
                <Text color="fg.muted" fontSize="sm" _hover={{ color: 'accent.neon' }}>
                  {item.label}
                </Text>
              </NextLink>
            ))}
          </Stack>

          <Stack gap="2">
            <Text color="fg.default" fontWeight="700" fontSize="sm" textTransform="uppercase" letterSpacing="0.14em">
              Company
            </Text>
            {COMPANY_FOOTER.map((item) => (
              <NextLink key={item.href} href={item.href}>
                <Text color="fg.muted" fontSize="sm" _hover={{ color: 'accent.neon' }}>
                  {item.label}
                </Text>
              </NextLink>
            ))}
          </Stack>

          <Stack gap="2">
            <Text color="fg.default" fontWeight="700" fontSize="sm" textTransform="uppercase" letterSpacing="0.14em">
              Services
            </Text>
            {SERVICES_FOOTER.map((item) => (
              <NextLink key={item.href} href={item.href}>
                <Text color="fg.muted" fontSize="sm" _hover={{ color: 'accent.neon' }}>
                  {item.label}
                </Text>
              </NextLink>
            ))}
          </Stack>

          <Stack gap="2">
            <Text color="fg.default" fontWeight="700" fontSize="sm" textTransform="uppercase" letterSpacing="0.14em">
              Locations
            </Text>
            {LOCATIONS_FOOTER.map((item) => (
              <NextLink key={item.href} href={item.href}>
                <Text color="fg.muted" fontSize="sm" _hover={{ color: 'accent.neon' }}>
                  {item.label}
                </Text>
              </NextLink>
            ))}
          </Stack>

          <Stack gap="2">
            <Text color="fg.default" fontWeight="700" fontSize="sm" textTransform="uppercase" letterSpacing="0.14em">
              Legal
            </Text>
            {LEGAL.map((item) => (
              <NextLink key={item.href} href={item.href}>
                <Text color="fg.muted" fontSize="sm" _hover={{ color: 'accent.neon' }}>
                  {item.label}
                </Text>
              </NextLink>
            ))}
          </Stack>
        </SimpleGrid>

        <HStack
          mt={{ base: '10', md: '14' }}
          pt="6"
          borderTopWidth="1px"
          borderColor="border.subtle"
          justify="space-between"
          flexWrap="wrap"
          gap="2"
        >
          <Text color="fg.muted" fontSize="xs">
            &copy; {year} {siteConfig.businessName}. All rights reserved.
          </Text>
          <Text color="fg.muted" fontSize="xs">
            Coverage: {siteConfig.coverageCountry}. HQ: {siteConfig.hqCity}.
          </Text>
        </HStack>
      </Container>
    </Box>
  );
}

export default SiteFooter;
