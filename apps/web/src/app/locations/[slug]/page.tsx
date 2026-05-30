import type { Metadata } from 'next';
import { Box } from '@chakra-ui/react';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingActions } from '@/components/floating/FloatingActions';
import { Breadcrumb, LocationHero } from '@/components/locations/LocationHero';
import { LocationContent } from '@/components/locations/LocationContent';
import { LocationServiceCards } from '@/components/locations/LocationServiceCards';
import { LocationNearbyLinks } from '@/components/locations/LocationNearbyLinks';
import { ServiceFaq } from '@/components/services/ServiceFaq';
import { ServiceCta } from '@/components/services/ServiceCta';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { JsonLd } from '@/components/seo/JsonLd';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import { buildLocationLocalBusinessSchema } from '@/lib/seo/schema';
import { buildSeoMetadata, buildNoIndexMetadata } from '@/lib/seo/metadata';
import { findLocationPage, getAllLocationSlugs } from '@/lib/seo/location-pages';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllLocationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = findLocationPage(slug);
  if (!page) {
    return buildNoIndexMetadata({
      title: 'Location not found',
      description: 'This location page does not exist.',
      path: `/locations/${slug}`,
    });
  }
  return buildSeoMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: `/locations/${page.slug}`,
    keywords: page.primaryKeywords,
  });
}

export default async function LocationPageRoute({ params }: PageProps) {
  const { slug } = await params;
  const page = findLocationPage(slug);
  if (!page) notFound();

  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'Locations', href: '/locations' },
    { name: page.city, href: `/locations/${page.slug}` },
  ];

  return (
    <>
      <LocalBusinessJsonLd />
      <JsonLd
        id={`ld-location-${page.slug}`}
        data={buildLocationLocalBusinessSchema({
          city: page.city,
          region: page.region,
          pathname: `/locations/${page.slug}`,
          description: page.metaDescription,
          slug: page.slug,
        })}
      />
      <BreadcrumbJsonLd items={breadcrumb} />
      <FaqJsonLd items={page.faq} pageId={`location-${page.slug}`} />

      <SiteHeader />
      <Box as="main">
        <Breadcrumb items={breadcrumb} />
        <LocationHero
          city={page.city}
          region={page.region}
          title={page.heroTitle}
          intro={page.heroIntro}
          primaryKeywords={page.primaryKeywords}
        />
        <LocationContent page={page} />
        <LocationServiceCards serviceSlugs={page.relatedServices} city={page.city} />
        <ServiceFaq items={page.faq} heading={`${page.city} mobile tyre — common questions`} />
        <LocationNearbyLinks slugs={page.nearbyLocationSlugs} currentSlug={page.slug} />
        <ServiceCta
          ctaLabel="Get Instant Emergency Quote"
          ctaHref="/quote"
          variant="location"
        />
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
