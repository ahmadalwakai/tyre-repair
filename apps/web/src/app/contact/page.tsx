import type { Metadata } from 'next';
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';
import { Breadcrumb } from '@/components/locations/LocationHero';
import { ServiceCta } from '@/components/services/ServiceCta';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldBadge } from '@/components/ui/GoldBadge';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { JsonLd } from '@/components/seo/JsonLd';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { buildContactPageSchema } from '@/lib/seo/schema';
import { siteConfig } from '@/lib/site-config';
import { FiPhone } from 'react-icons/fi';

const PAGE_TITLE = 'Contact TyreRepair UK';
const PAGE_DESCRIPTION =
  'Contact TyreRepair UK for emergency mobile tyre help across Scotland. Call 0141 266 0690, message on WhatsApp or get an instant online quote.';

export const metadata: Metadata = buildSeoMetadata({
  title: `${PAGE_TITLE} | Emergency Mobile Tyre Help`,
  description: PAGE_DESCRIPTION,
  path: '/contact',
});

interface ContactCard {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  variant: 'solid' | 'outline' | 'ghost';
  isExternal?: boolean;
}

const CONTACT_CARDS: readonly ContactCard[] = [
  {
    title: 'Call for fastest help',
    body: 'A real person will pick up the phone. This is the fastest way to get an emergency tyre van moving.',
    ctaLabel: `Call ${siteConfig.phoneDisplay}`,
    ctaHref: siteConfig.phoneHref,
    variant: 'solid',
  },
  {
    title: 'WhatsApp for quick messages',
    body: 'Send your location, photos of the tyre and the vehicle details. Useful when a phone call is awkward.',
    ctaLabel: 'Message on WhatsApp',
    ctaHref: siteConfig.whatsappHref,
    variant: 'outline',
    isExternal: true,
  },
  {
    title: 'Quote online for emergency booking',
    body: 'Get a price in seconds, share your location and pay securely without a date or time picker.',
    ctaLabel: 'Get instant quote',
    ctaHref: '/quote',
    variant: 'ghost',
  },
];

const WHEN_TO_CALL = [
  'Flat tyre or puncture',
  'Tyre damaged or blown out',
  'Losing pressure',
  'Need replacement tyre',
  'Not sure what tyre size you need',
];

export default function ContactPage() {
  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <>
      <LocalBusinessJsonLd />
      <BreadcrumbJsonLd items={breadcrumb} />
      <JsonLd
        id="ld-contactpage"
        data={buildContactPageSchema({
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          pathname: '/contact',
        })}
      />
      <SiteHeader />
      <Box as="main">
        <Breadcrumb items={breadcrumb} />

        <Box as="section" bg="bg.canvas" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }}>
          <Container maxW="5xl">
            <Stack gap="5" align="flex-start">
              <GoldBadge icon={<FiPhone />}>24/7 emergency line · Glasgow base</GoldBadge>
              <Heading as="h1" fontFamily="heading" fontSize={{ base: '3xl', md: '5xl' }} lineHeight="1.1" color="fg.default">
                Need tyre help now?
              </Heading>
              <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="3xl" lineHeight="1.7">
                The fastest way to reach us is the phone. WhatsApp is good for sending pictures and
                a location. The online quote is good if you already know what you need.
              </Text>
              <Stack direction={{ base: 'column', sm: 'row' }} gap="3" pt="2">
                <GoldButton href={siteConfig.phoneHref} size="lg" callTrackingSource="ContactPage.hero">
                  Call {siteConfig.phoneDisplay}
                </GoldButton>
                <GoldButton href={siteConfig.whatsappHref} variant="outline" size="lg" isExternal>
                  WhatsApp
                </GoldButton>
                <GoldButton href="/quote" variant="ghost" size="lg">
                  Get instant quote
                </GoldButton>
              </Stack>
            </Stack>
          </Container>
        </Box>

        <Box as="section" bg="bg.surface" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }} borderTopWidth="1px" borderColor="border.subtle">
          <Container maxW="5xl">
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="8">
              <Stack gap="4">
                <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
                  Emergency contact
                </Heading>
                <Stack gap="2">
                  <Text color="fg.muted">
                    Phone:{' '}
                    <a href={siteConfig.phoneHref}>
                      <Text as="span" color="accent.neon" fontWeight="600">
                        {siteConfig.phoneDisplay}
                      </Text>
                    </a>
                  </Text>
                  <Text color="fg.muted">
                    WhatsApp:{' '}
                    <a href={siteConfig.whatsappHref} target="_blank" rel="noopener noreferrer">
                      <Text as="span" color="accent.neon" fontWeight="600">
                        {siteConfig.whatsappDisplay}
                      </Text>
                    </a>
                  </Text>
                </Stack>
              </Stack>
              <Stack gap="4">
                <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
                  Business address
                </Heading>
                <Stack gap="1">
                  <Text color="fg.default" fontWeight="600">{siteConfig.businessName}</Text>
                  <Text color="fg.muted">Unit 1, 10 Gateside Street</Text>
                  <Text color="fg.muted">Glasgow G31 1PD</Text>
                </Stack>
              </Stack>
            </SimpleGrid>
          </Container>
        </Box>

        <Box as="section" bg="bg.canvas" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }}>
          <Container maxW="5xl">
            <Stack gap="4">
              <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
                Service area
              </Heading>
              <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} lineHeight="1.7">
                Based in Glasgow and covering Scotland with mobile tyre repair, puncture help and
                replacement tyres. Central belt and Lothians are routine cover. Highland, Borders
                and island work is honestly quoted with realistic travel time.
              </Text>
            </Stack>
          </Container>
        </Box>

        <Box as="section" bg="bg.surface" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }} borderTopWidth="1px" borderColor="border.subtle">
          <Container maxW="5xl">
            <Stack gap="5">
              <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
                When to call
              </Heading>
              <SimpleGrid columns={{ base: 1, sm: 2 }} gap="3">
                {WHEN_TO_CALL.map((line) => (
                  <Box
                    key={line}
                    bg="bg.canvas"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    borderRadius="md"
                    px="4"
                    py="3"
                  >
                    <Text color="fg.default" fontSize="sm">{line}</Text>
                  </Box>
                ))}
              </SimpleGrid>
            </Stack>
          </Container>
        </Box>

        <Box as="section" bg="bg.canvas" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }}>
          <Container maxW="5xl">
            <Stack gap="6">
              <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
                Contact options
              </Heading>
              <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
                {CONTACT_CARDS.map((card) => (
                  <Box
                    key={card.title}
                    bg="bg.surface"
                    borderWidth="1px"
                    borderColor="border.gold"
                    borderRadius="lg"
                    p="5"
                  >
                    <Stack gap="3" h="100%">
                      <Heading as="h3" fontFamily="heading" fontSize="lg" color="accent.neon">
                        {card.title}
                      </Heading>
                      <Text color="fg.muted" fontSize="sm" lineHeight="1.6" flex="1">
                        {card.body}
                      </Text>
                      <Box>
                        <GoldButton
                          href={card.ctaHref}
                          variant={card.variant}
                          size="md"
                          fullWidth
                          {...(card.isExternal ? { isExternal: true } : {})}
                        >
                          {card.ctaLabel}
                        </GoldButton>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </SimpleGrid>
            </Stack>
          </Container>
        </Box>

        <ServiceCta ctaLabel={siteConfig.primaryCtaLabel} ctaHref={siteConfig.primaryCtaHref} />
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
