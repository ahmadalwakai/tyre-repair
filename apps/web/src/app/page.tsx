import type { Metadata } from 'next';
import { Box, Container } from '@chakra-ui/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';
import { HeroSection } from '@/components/landing/HeroSection';
import { EmergencyBanner } from '@/components/landing/EmergencyBanner';
import { ServiceStatusBanner } from '@/components/landing/ServiceStatusBanner';
import { ServicesSection } from '@/components/landing/ServicesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { CoverageSection } from '@/components/landing/CoverageSection';
import { WhyChooseUsSection } from '@/components/landing/WhyChooseUsSection';
import { StockPreviewSection } from '@/components/landing/StockPreviewSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { FinalCtaSection } from '@/components/landing/FinalCtaSection';
import { InternalLinkGrid } from '@/components/seo/InternalLinkGrid';
import { buildSeoMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildSeoMetadata({
  title: 'Mobile Tyre Fitting Near You | TyreRepair UK',
  description:
    'Mobile tyre fitting and emergency tyre repair across Scotland from a Glasgow base. Day, night and weekend mobile tyre fitter — quote in seconds.',
  path: '/',
});

const TOP_SERVICE_LINKS = [
  {
    label: 'Mobile tyre fitting',
    href: '/services/mobile-tyre-fitting',
    description: 'New tyres fitted at home, work or roadside.',
  },
  {
    label: 'Emergency tyre repair',
    href: '/services/emergency-tyre-repair',
    description: 'Flat, blowout or damaged tyre — mobile help.',
  },
  {
    label: '24 hour mobile tyre fitting',
    href: '/services/24-hour-mobile-tyre-fitting',
    description: 'Late nights, Sundays and bank holidays.',
  },
  {
    label: 'Puncture repair',
    href: '/services/puncture-repair',
    description: 'Honest repair-or-replace assessment.',
  },
  {
    label: 'Glasgow mobile tyre fitter',
    href: '/locations/glasgow',
    description: 'Glasgow base, full city cover G1–G77.',
  },
  {
    label: 'Edinburgh mobile tyre fitter',
    href: '/locations/edinburgh',
    description: 'Edinburgh and Lothians from Glasgow.',
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <Box as="main">
        <HeroSection />
        <ServiceStatusBanner />
        <EmergencyBanner />
        <ServicesSection />
        <HowItWorksSection />
        <CoverageSection />
        <WhyChooseUsSection />
        <StockPreviewSection />
        <Box bg="bg.surface" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }}>
          <Container maxW="6xl">
            <InternalLinkGrid
              title="Top services and locations"
              intro="Common starting points for mobile tyre help across Scotland."
              links={TOP_SERVICE_LINKS}
              columns={{ base: 1, md: 3 }}
            />
          </Container>
        </Box>
        <TestimonialsSection />
        <FaqSection />
        <FinalCtaSection />
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
