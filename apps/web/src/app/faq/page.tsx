import type { Metadata } from 'next';
import { Box } from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';
import { Breadcrumb } from '@/components/locations/LocationHero';
import { ServiceFaq } from '@/components/services/ServiceFaq';
import { ServiceCta } from '@/components/services/ServiceCta';
import { ServiceHero } from '@/components/services/ServiceHero';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import { InternalLinkGrid } from '@/components/seo/InternalLinkGrid';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { getTopServiceLinks, getTopLocationLinks } from '@/lib/seo/hub-links';

export const metadata: Metadata = buildSeoMetadata({
  title: 'Mobile Tyre Fitting FAQ | TyreRepair UK',
  description:
    'Honest answers to mobile tyre fitting questions: cost, timing, repair vs replace, run flats, sidewall damage, motorway safety, payment and stock.',
  path: '/faq',
});

const FAQ = [
  {
    question: 'How does mobile tyre fitting work?',
    answer:
      'You request a quote, share the location and vehicle, choose a tyre and pay. A fully equipped tyre van comes to your location, removes the wheel, fits and balances the new tyre on the rim, and refits it to the vehicle.',
  },
  {
    question: 'How fast can a mobile tyre fitter come out?',
    answer:
      'Real-world dispatch depends on traffic, weather and current demand. We are honest about timing on the call rather than promising a number we cannot guarantee.',
  },
  {
    question: 'How much does mobile tyre fitting cost?',
    answer:
      'The quote shows the price clearly before you pay. Pricing reflects the tyre, time of day, weather, weekend or bank holiday surcharges, and travel distance to your location. There is no separate callout fee added after arrival.',
  },
  {
    question: 'Do mobile tyre fitters work on Sundays and bank holidays?',
    answer:
      'Yes — Sundays, late nights and bank holidays are part of the 24/7 service. Pricing for unsocial hours is shown in the quote before payment.',
  },
  {
    question: 'Can a tyre be repaired with a nail still in it?',
    answer:
      'Not safely. The tyre has to come off the wheel for an internal inspection. A safe repair is fitted from the inside of the tyre, not just plugged from the outside.',
  },
  {
    question: 'Can sidewall damage be repaired?',
    answer:
      'No. The sidewall flexes constantly and any repair there is unsafe. Sidewall damage, bulges, or run-flats that have been driven on flat all need replacement, not repair.',
  },
  {
    question: 'My tyre keeps losing pressure — is it repairable?',
    answer:
      'Slow pressure loss is usually a small puncture, valve issue or rim leak. The tyre needs to be inspected from the inside to know if a safe repair is possible.',
  },
  {
    question: 'Can you fit run flat tyres?',
    answer:
      'Yes — common BMW, Mini and Audi run flat sizes are stocked or sourced quickly. Once a run flat has supported the vehicle after pressure loss, replacement is the safe option, not repair.',
  },
  {
    question: 'What if my tyre size is unusual or out of stock?',
    answer:
      'If the exact size is not on the van we will source it. The site will show "Special order — fitted within 3 working days" before you pay.',
  },
  {
    question: 'Do I have to be home for the fitting?',
    answer:
      'You need to be reachable on the phone number you provide so we can confirm wheel access, alarm settings and the location of the locking wheel nut key.',
  },
  {
    question: 'Can you fit tyres I supply myself?',
    answer:
      'We strongly recommend buying through the quote so the tyre is the correct size, load and speed rating for the vehicle. Customer-supplied tyres are considered case-by-case.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'Card payment is taken securely online when the quote is accepted. There is no extra payment expected on arrival.',
  },
  {
    question: 'Do you really cover all of Scotland?',
    answer:
      'Yes — we run a mobile fleet of vans and drivers covering the whole of Scotland. Central belt, Lothians, Fife, Stirling, Lanarkshire, Renfrewshire and Ayrshire are routine same-day cover. Highland, Borders and island work is honestly quoted with realistic travel times before you commit.',
  },
  {
    question: 'What if I am stuck on the motorway with a flat tyre?',
    answer:
      'Motorway hard shoulders are unsafe to work on. If you are stopped on a live carriageway, follow official road safety advice first — get to a safe place and contact the appropriate emergency service if you feel unsafe. We will discuss the safest plan with you, which sometimes means a short recovery before fitting the new tyre.',
  },
  {
    question: 'Are you cheaper than a garage?',
    answer:
      'It depends on the job and the time. Mobile fitting often saves you a tow or recovery — that is where the value usually sits, not in a flat sticker price comparison.',
  },
  {
    question: 'Do you do fleet or taxi work?',
    answer:
      'Yes — small fleet support and taxi tyre fitting are part of the service. We can arrange clean invoicing for operators.',
  },
  {
    question: 'Can you replace a tyre if I am not at the vehicle?',
    answer:
      'In some cases yes, if access is safe, the locking wheel nut key is reachable, and you are contactable by phone for confirmation.',
  },
  {
    question: 'Are winter tyres legally required in Scotland?',
    answer:
      'No — Scotland does not legally require winter tyres. They are a personal safety choice that adds grip in cold and snowy conditions.',
  },
  {
    question: 'Will VAT and any extras be on the quote?',
    answer:
      'The quote shown before payment is the final figure for the work described. Any change of scope on site (e.g. a different tyre size discovered) will be confirmed with you before extra work begins.',
  },
];

export default function FaqPage() {
  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'FAQ', href: '/faq' },
  ];
  return (
    <>
      <LocalBusinessJsonLd />
      <BreadcrumbJsonLd items={breadcrumb} />
      <FaqJsonLd items={FAQ} pageId="site-faq" />
      <SiteHeader />
      <Box as="main">
        <Breadcrumb items={breadcrumb} />
        <ServiceHero
          title="Mobile tyre fitting — your questions answered"
          intro="Honest answers to the questions we get asked most often. If your question is not here, call or message us — we will be straight with you."
          ctaLabel="Get Instant Emergency Quote"
          ctaHref="/quote"
        />
        <ServiceFaq items={FAQ} />
        <Box px={{ base: '4', md: '6' }} py={{ base: '8', md: '12' }} maxW="5xl" mx="auto">
          <InternalLinkGrid
            title="Jump to the service you need"
            intro="Each service page has its own pricing, FAQ and what to expect on site."
            links={getTopServiceLinks()}
            columns={{ base: 1, md: 2 }}
          />
        </Box>
        <Box px={{ base: '4', md: '6' }} pb={{ base: '8', md: '12' }} maxW="5xl" mx="auto">
          <InternalLinkGrid
            title="Where we cover"
            intro="Top areas covered by our Scotland-wide mobile fleet."
            links={getTopLocationLinks()}
            columns={{ base: 1, md: 4 }}
          />
        </Box>
        <ServiceCta ctaLabel="Get Instant Emergency Quote" ctaHref="/quote" />
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
