import type { Metadata } from 'next';
import {
  Box,
  Container,
  Heading,
  HStack,
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
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { buildWebPageSchema } from '@/lib/seo/schema';
import { siteConfig } from '@/lib/site-config';

const PAGE_TITLE = 'How TyreRepair UK works';
const PAGE_DESCRIPTION =
  'How emergency mobile tyre help works at TyreRepair UK: call or quote online, share location, repair-first assessment or replacement, clear price, then track your booking.';

export const metadata: Metadata = buildSeoMetadata({
  title: `${PAGE_TITLE} | Emergency Mobile Tyre Help`,
  description: PAGE_DESCRIPTION,
  path: '/how-it-works',
});

interface Step {
  number: string;
  heading: string;
  body: string;
  bullets?: readonly string[];
}

const STEPS: readonly Step[] = [
  {
    number: '1',
    heading: 'Call, WhatsApp or start a quote',
    body: 'Tell us what happened and where the vehicle is. A short conversation or a 60 second online quote is enough to get the right help moving.',
  },
  {
    number: '2',
    heading: 'Share your location',
    body: 'We need to know exactly where the vehicle is so the van can find you. There are three easy ways to do that:',
    bullets: [
      'Type your address or postcode',
      'Use your current location in the browser',
      'Send a secure location link if we ask for one',
    ],
  },
  {
    number: '3',
    heading: 'Assessment or replacement',
    body: 'If you are not sure what you need, choose assessment-first. We can check the tyre and confirm whether repair or replacement is needed before any extra work begins.',
  },
  {
    number: '4',
    heading: 'Clear price before payment',
    body: 'You see the price before payment. For some locations or cases, we may ask you to call first so we can confirm availability — there are no surprises added later.',
  },
  {
    number: '5',
    heading: 'Track your booking',
    body: 'After booking, you receive a tracking reference beginning with TR. Use it on the tracking page to follow updates from dispatch to completion.',
  },
];

interface SituationCard {
  title: string;
  body: string;
}

const SITUATIONS: readonly SituationCard[] = [
  {
    title: 'I do not know my tyre size',
    body: 'Choose "Book without tyre size" in the quote, or call us with the registration. We can confirm the correct size before fitting.',
  },
  {
    title: 'I have a puncture',
    body: 'Choose puncture or assessment in the quote. We will inspect the tyre internally and confirm whether a safe repair is possible.',
  },
  {
    title: 'My tyre is blown out',
    body: 'A blown-out tyre needs replacement, not repair. Tell us the location and the tyre size if you have it, and we will dispatch a fitting van.',
  },
  {
    title: 'I am roadside',
    body: 'If you are stopped on a live carriageway, follow official road safety advice first and get to a safe place. Then call us so we can plan the safest fit or short recovery.',
  },
  {
    title: 'I need help now',
    body: 'Use the emergency button on the homepage or call us directly. Our admin team is alerted instantly and will start a booking with you.',
  },
];

export default function HowItWorksPage() {
  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'How it works', href: '/how-it-works' },
  ];

  return (
    <>
      <LocalBusinessJsonLd />
      <BreadcrumbJsonLd items={breadcrumb} />
      <JsonLd
        id="ld-howitworks-webpage"
        data={buildWebPageSchema({
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          pathname: '/how-it-works',
        })}
      />
      <SiteHeader />
      <Box as="main">
        <Breadcrumb items={breadcrumb} />
        <ServiceHero
          title="Emergency tyre help without complicated booking"
          intro="No date picker, no time slot, no customer account. Tell us what is wrong, share your location, see the price, and a mobile tyre van comes to you."
          ctaLabel={siteConfig.primaryCtaLabel}
          ctaHref={siteConfig.primaryCtaHref}
        />

        <Box as="section" bg="bg.canvas" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }}>
          <Container maxW="5xl">
            <Stack gap="8">
              {STEPS.map((step) => (
                <Box
                  key={step.number}
                  bg="bg.surface"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  borderRadius="lg"
                  p={{ base: '5', md: '6' }}
                >
                  <HStack align="flex-start" gap="4">
                    <Box
                      minW="44px"
                      h="44px"
                      borderRadius="full"
                      bg="accent.solid"
                      color="bg.canvas"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontFamily="heading"
                      fontSize="lg"
                      fontWeight="700"
                    >
                      {step.number}
                    </Box>
                    <Stack gap="3" flex="1">
                      <Heading as="h2" fontFamily="heading" fontSize={{ base: 'xl', md: '2xl' }} color="fg.default">
                        Step {step.number} — {step.heading}
                      </Heading>
                      <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} lineHeight="1.7">
                        {step.body}
                      </Text>
                      {step.bullets ? (
                        <Stack as="ul" gap="2" pl="5" listStyleType="disc">
                          {step.bullets.map((b) => (
                            <Text as="li" key={b} color="fg.muted" fontSize="sm">
                              {b}
                            </Text>
                          ))}
                        </Stack>
                      ) : null}
                    </Stack>
                  </HStack>
                </Box>
              ))}
            </Stack>
          </Container>
        </Box>

        <Box as="section" bg="bg.surface" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }} borderTopWidth="1px" borderColor="border.subtle">
          <Container maxW="5xl">
            <Stack gap="6">
              <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
                Common situations
              </Heading>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="4">
                {SITUATIONS.map((card) => (
                  <Box
                    key={card.title}
                    bg="bg.canvas"
                    borderWidth="1px"
                    borderColor="border.gold"
                    borderRadius="lg"
                    p="5"
                  >
                    <Stack gap="2">
                      <Heading as="h3" fontFamily="heading" fontSize="md" color="accent.neon">
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

        <ServiceCta ctaLabel={siteConfig.primaryCtaLabel} ctaHref={siteConfig.primaryCtaHref} />
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
