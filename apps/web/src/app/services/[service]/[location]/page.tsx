import type { Metadata } from 'next';
import { Box } from '@chakra-ui/react';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';
import { Breadcrumb } from '@/components/locations/LocationHero';
import { ServiceHero } from '@/components/services/ServiceHero';
import { ServiceContent } from '@/components/services/ServiceContent';
import { ServiceFaq } from '@/components/services/ServiceFaq';
import { ServiceCta } from '@/components/services/ServiceCta';
import { InternalLinkGrid } from '@/components/seo/InternalLinkGrid';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import { ServiceJsonLd } from '@/components/seo/ServiceJsonLd';
import { buildSeoMetadata, buildNoIndexMetadata } from '@/lib/seo/metadata';
import {
  buildComboCopy,
  findServiceLocationCombo,
  getAllServiceLocationCombos,
} from '@/lib/seo/service-location-combos';
import { findLocationPage } from '@/lib/seo/location-pages';
import type { InternalLinkItem } from '@/types/seo';

interface PageProps {
  params: Promise<{ service: string; location: string }>;
}

export function generateStaticParams() {
  return getAllServiceLocationCombos().map(({ service, location }) => ({
    service: service.slug,
    location: location.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { service: serviceSlug, location: locationSlug } = await params;
  const combo = findServiceLocationCombo(serviceSlug, locationSlug);
  if (!combo) {
    return buildNoIndexMetadata({
      title: 'Page not found',
      description: 'This service / location combination does not exist.',
      path: `/services/${serviceSlug}/${locationSlug}`,
    });
  }
  const copy = buildComboCopy(combo);
  return buildSeoMetadata({
    title: copy.metaTitle,
    description: copy.metaDescription,
    path: `/services/${combo.service.slug}/${combo.location.slug}`,
    keywords: copy.primaryKeywords,
  });
}

export default async function ServiceLocationComboRoute({ params }: PageProps) {
  const { service: serviceSlug, location: locationSlug } = await params;
  const combo = findServiceLocationCombo(serviceSlug, locationSlug);
  if (!combo) notFound();

  const { service, location } = combo;
  const copy = buildComboCopy(combo);

  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'Services', href: '/services' },
    { name: service.title, href: `/services/${service.slug}` },
    { name: location.city, href: `/services/${service.slug}/${location.slug}` },
  ];

  const nearbyLocationLinks: InternalLinkItem[] = location.nearbyLocationSlugs
    .map((s) => findLocationPage(s))
    .filter((p): p is NonNullable<ReturnType<typeof findLocationPage>> => Boolean(p))
    .map((p) => ({
      label: `${service.title} in ${p.city}`,
      href: `/services/${service.slug}/${p.slug}`,
      description: p.region,
    }));

  const relatedServiceLinks: InternalLinkItem[] = service.relatedServices
    .map((s) => ({ slug: s, page: undefined as ReturnType<typeof findLocationPage> | undefined }))
    .map((entry) => entry.slug)
    .map((slug) => {
      // Lazy-resolve sibling service titles by importing from service-pages
      // via the combo helper would be circular; just build a sensible label.
      return {
        label: humaniseSlug(slug) + ` in ${location.city}`,
        href: `/services/${slug}/${location.slug}`,
        description: 'Same mobile fleet, dispatched to your location.',
      };
    });

  return (
    <>
      <LocalBusinessJsonLd />
      <ServiceJsonLd
        name={`${service.title} in ${location.city}`}
        description={copy.metaDescription}
        pathname={`/services/${service.slug}/${location.slug}`}
      />
      <BreadcrumbJsonLd items={breadcrumb} />
      <FaqJsonLd items={copy.faq} pageId={`combo-${service.slug}-${location.slug}`} />

      <SiteHeader />
      <Box as="main">
        <Breadcrumb items={breadcrumb} />
        <ServiceHero
          title={copy.heroTitle}
          intro={copy.heroIntro}
          ctaLabel={service.ctaLabel}
          ctaHref={service.ctaHref}
        />
        <ServiceContent sections={copy.sections} />
        <ServiceFaq items={copy.faq} />
        {nearbyLocationLinks.length > 0 ? (
          <Box px={{ base: '4', md: '6' }} py={{ base: '8', md: '12' }} maxW="5xl" mx="auto">
            <InternalLinkGrid
              title={`${service.title} in nearby areas`}
              intro={`Same service, neighbouring ${location.region} locations.`}
              links={nearbyLocationLinks}
              columns={{ base: 1, md: 3 }}
            />
          </Box>
        ) : null}
        <Box px={{ base: '4', md: '6' }} pb={{ base: '8', md: '12' }} maxW="5xl" mx="auto">
          <InternalLinkGrid
            title={`Other tyre services in ${location.city}`}
            intro="People who looked at this service often also need:"
            links={relatedServiceLinks}
            columns={{ base: 1, md: 3 }}
          />
        </Box>
        <ServiceCta ctaLabel={service.ctaLabel} ctaHref={service.ctaHref} />
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}

function humaniseSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length <= 2 ? w : w[0]!.toUpperCase() + w.slice(1)))
    .join(' ');
}
