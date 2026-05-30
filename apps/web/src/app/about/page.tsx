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
import { ServiceHero } from '@/components/services/ServiceHero';
import { ServiceCta } from '@/components/services/ServiceCta';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { JsonLd } from '@/components/seo/JsonLd';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import { InternalLinkGrid } from '@/components/seo/InternalLinkGrid';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { buildAboutPageSchema } from '@/lib/seo/schema';
import { getTopServiceLinks, getTopLocationLinks } from '@/lib/seo/hub-links';
import { siteConfig } from '@/lib/site-config';

const PAGE_TITLE = 'About TyreRepair UK';
const PAGE_DESCRIPTION =
  'Glasgow-based mobile tyre repair and replacement covering Scotland. Repair-first assessment, honest pricing and 24/7 emergency tyre help.';

export const metadata: Metadata = buildSeoMetadata({
  title: `${PAGE_TITLE} | Mobile Tyre Help in Scotland`,
  description: PAGE_DESCRIPTION,
  path: '/about',
});

interface ServiceCard {
  title: string;
  body: string;
}

const SERVICE_CARDS: readonly ServiceCard[] = [
  {
    title: 'Emergency tyre help',
    body: '24/7 mobile response for flat tyres, blowouts and roadside problems across Scotland.',
  },
  {
    title: 'Puncture repair',
    body: 'Internal inspection and safe puncture repair where the damage is in the repairable area of the tread.',
  },
  {
    title: 'Mobile tyre fitting',
    body: 'Fully equipped tyre van that comes to your location to remove, balance and refit the wheel.',
  },
  {
    title: 'Replacement tyres',
    body: 'Common car, van and run flat sizes available, with special order sizes fitted within 3 working days.',
  },
  {
    title: 'Roadside tyre help',
    body: 'Help for drivers stuck at the kerbside, in car parks, at home or at work — wherever the vehicle is safe to work on.',
  },
  {
    title: 'Assessment-first service',
    body: 'Not sure if you need a repair or a new tyre? We can assess the tyre first and confirm the next step before any replacement.',
  },
];

interface PromiseRow {
  heading: string;
  body: string;
}

const HONEST_PROMISES: readonly PromiseRow[] = [
  {
    heading: 'No fake arrival guarantees',
    body: 'Emergency tyre work depends on distance, traffic, weather and tyre availability, so we do not publish arrival times we cannot honour.',
  },
  {
    heading: 'No fake branches',
    body: 'A Scotland-wide mobile fleet with one head office. We do not invent fake depots — every van and driver is real.',
  },
  {
    heading: 'No pressure to replace',
    body: 'If a tyre can be repaired safely and legally we recommend the repair. Replacement is only suggested when it is the safe option.',
  },
];

export default function AboutPage() {
  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
  ];

  return (
    <>
      <LocalBusinessJsonLd />
      <BreadcrumbJsonLd items={breadcrumb} />
      <JsonLd
        id="ld-aboutpage"
        data={buildAboutPageSchema({
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          pathname: '/about',
        })}
      />
      <SiteHeader />
      <Box as="main">
        <Breadcrumb items={breadcrumb} />
        <ServiceHero
          title="Scotland-wide mobile tyre help — we come to you"
          intro="TyreRepair UK is a Scotland-wide mobile tyre repair and replacement service. Vans and drivers cover the whole country, day and night, with a repair-first assessment, honest pricing and one direct phone line."
          ctaLabel={siteConfig.primaryCtaLabel}
          ctaHref={siteConfig.primaryCtaHref}
        />

        <Box as="section" bg="bg.canvas" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }}>
          <Container maxW="5xl">
            <Stack gap="5">
              <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
                Who we are
              </Heading>
              <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} lineHeight="1.7">
                TyreRepair UK is a Scotland-wide mobile tyre repair and replacement service. Our
                fleet of vans and drivers covers the whole of Scotland with urgent tyre help. We
                work directly with the customer over the phone or through the online quote, so
                there is no waiting room and no diary slot — every job is treated as an emergency
                response.
              </Text>
              <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} lineHeight="1.7">
                The business is run by people who answer the phone themselves. There is no
                marketing call centre between you and the workshop.
              </Text>
            </Stack>
          </Container>
        </Box>

        <Box as="section" bg="bg.surface" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }} borderTopWidth="1px" borderColor="border.subtle">
          <Container maxW="5xl">
            <Stack gap="6">
              <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
                What we do
              </Heading>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="4">
                {SERVICE_CARDS.map((card) => (
                  <Box
                    key={card.title}
                    bg="bg.canvas"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    borderRadius="lg"
                    p="5"
                  >
                    <Stack gap="2">
                      <Heading as="h3" fontFamily="heading" fontSize="lg" color="accent.neon">
                        {card.title}
                      </Heading>
                      <Text color="fg.muted" fontSize="sm" lineHeight="1.6">
                        {card.body}
                      </Text>
                    </Stack>
                  </Box>
                ))}
              </SimpleGrid>
            </Stack>
          </Container>
        </Box>

        <Box as="section" bg="bg.canvas" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }}>
          <Container maxW="5xl">
            <Stack gap="5">
              <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
                Our repair-first approach
              </Heading>
              <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} lineHeight="1.7">
                We do not force every customer to buy a tyre. If a tyre can be repaired safely and
                legally, we assess it first. If replacement is needed, we confirm the next step
                clearly before any extra work begins.
              </Text>
              <Text color="fg.muted" fontSize="sm" lineHeight="1.7">
                Not every puncture is repairable — sidewall damage, run flats that have been driven
                on flat, and tyres outside the safe repair area need replacement. We will tell you
                that honestly on the call.
              </Text>
            </Stack>
          </Container>
        </Box>

        <Box as="section" bg="bg.surface" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }} borderTopWidth="1px" borderColor="border.subtle">
          <Container maxW="5xl">
            <Stack gap="5">
              <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
                Head office
              </Heading>
              <Stack gap="1">
                <Text color="fg.default" fontWeight="600">{siteConfig.businessName}</Text>
                <Text color="fg.muted">Unit 1, 10 Gateside Street</Text>
                <Text color="fg.muted">Glasgow G31 1PD</Text>
                <Text color="fg.muted" pt="2">
                  Phone: <a href={siteConfig.phoneHref}><Text as="span" color="accent.neon">{siteConfig.phoneDisplay}</Text></a>
                </Text>
                <Text color="fg.muted">
                  WhatsApp: <a href={siteConfig.whatsappHref} target="_blank" rel="noopener noreferrer"><Text as="span" color="accent.neon">{siteConfig.whatsappDisplay}</Text></a>
                </Text>
              </Stack>
              <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} lineHeight="1.7">
                The head office is in Glasgow but the service is mobile and Scotland-wide. Our vans
                and drivers cover the whole country — we come to your location, whether you are in
                the central belt, the Lothians, Fife, Stirling, Ayrshire, the Highlands or the
                Borders.
              </Text>
            </Stack>
          </Container>
        </Box>

        <Box as="section" bg="bg.canvas" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }}>
          <Container maxW="5xl">
            <Stack gap="6">
              <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
                What we do not promise
              </Heading>
              <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
                {HONEST_PROMISES.map((row) => (
                  <Box
                    key={row.heading}
                    bg="bg.surface"
                    borderWidth="1px"
                    borderColor="border.gold"
                    borderRadius="lg"
                    p="5"
                  >
                    <Stack gap="2">
                      <Heading as="h3" fontFamily="heading" fontSize="md" color="accent.neon">
                        {row.heading}
                      </Heading>
                      <Text color="fg.muted" fontSize="sm" lineHeight="1.6">
                        {row.body}
                      </Text>
                    </Stack>
                  </Box>
                ))}
              </SimpleGrid>
            </Stack>
          </Container>
        </Box>

        <Box px={{ base: '4', md: '6' }} py={{ base: '8', md: '12' }} maxW="5xl" mx="auto">
          <InternalLinkGrid
            title="Our core mobile tyre services"
            intro="Whatever the tyre problem, we have a dedicated service page for it."
            links={getTopServiceLinks()}
            columns={{ base: 1, md: 2 }}
          />
        </Box>
        <Box px={{ base: '4', md: '6' }} pb={{ base: '8', md: '12' }} maxW="5xl" mx="auto">
          <InternalLinkGrid
            title="Areas we cover"
            intro="Scotland-wide mobile cover — same callout, same standards, vans to your door."
            links={getTopLocationLinks()}
            columns={{ base: 1, md: 4 }}
          />
        </Box>

        <ServiceCta ctaLabel={siteConfig.primaryCtaLabel} ctaHref={siteConfig.primaryCtaHref} />
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
