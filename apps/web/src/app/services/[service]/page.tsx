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
import { findServicePage, servicePages, SERVICE_SLUGS } from '@/lib/seo/service-pages';
import { findLocationPage } from '@/lib/seo/location-pages';
import type { InternalLinkItem } from '@/types/seo';

interface PageProps {
  params: Promise<{ service: string }>;
}

export function generateStaticParams() {
  return SERVICE_SLUGS.map((service) => ({ service }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { service: slug } = await params;
  const page = findServicePage(slug);
  if (!page) {
    return buildNoIndexMetadata({
      title: 'Service not found',
      description: 'This service page does not exist.',
      path: `/services/${slug}`,
    });
  }
  return buildSeoMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: `/services/${page.slug}`,
    keywords: page.primaryKeywords,
  });
}

export default async function ServicePageRoute({ params }: PageProps) {
  const { service: slug } = await params;
  const page = findServicePage(slug);
  if (!page) notFound();

  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'Services', href: '/services' },
    { name: page.title, href: `/services/${page.slug}` },
  ];

  const relatedServiceLinks: InternalLinkItem[] = page.relatedServices
    .map((s) => servicePages.find((p) => p.slug === s))
    .filter((p): p is NonNullable<ReturnType<typeof findServicePage>> => Boolean(p))
    .filter((p) => p.slug !== page.slug)
    .map((p) => ({ label: p.title, href: `/services/${p.slug}`, description: p.metaDescription }));

  const relatedLocationLinks: InternalLinkItem[] = page.relatedLocations
    .map((s) => findLocationPage(s))
    .filter((p): p is NonNullable<ReturnType<typeof findLocationPage>> => Boolean(p))
    .map((p) => ({
      label: `${p.city} mobile tyre fitting`,
      href: `/services/${page.slug}/${p.slug}`,
      description: p.region,
    }));

  return (
    <>
      <LocalBusinessJsonLd />
      <ServiceJsonLd
        name={page.title}
        description={page.metaDescription}
        pathname={`/services/${page.slug}`}
      />
      <BreadcrumbJsonLd items={breadcrumb} />
      <FaqJsonLd items={page.faq} pageId={`service-${page.slug}`} />

      <SiteHeader />
      <Box as="main">
        <Breadcrumb items={breadcrumb} />
        <ServiceHero
          title={page.heroTitle}
          intro={page.heroIntro}
          ctaLabel={page.ctaLabel}
          ctaHref={page.ctaHref}
        />
        <ServiceContent sections={page.sections} />
        <ServiceFaq items={page.faq} />
        <Box px={{ base: '4', md: '6' }} py={{ base: '8', md: '12' }} maxW="5xl" mx="auto">
          <InternalLinkGrid
            title="Other tyre services"
            intro="People who looked at this service often also need:"
            links={relatedServiceLinks}
          />
        </Box>
        <Box px={{ base: '4', md: '6' }} pb={{ base: '8', md: '12' }} maxW="5xl" mx="auto">
          <InternalLinkGrid
            title={`${page.title} — locations covered`}
            intro="Scotland-wide mobile cover — vans dispatched to your location."
            links={relatedLocationLinks}
            columns={{ base: 1, md: 4 }}
          />
        </Box>
        <ServiceCta ctaLabel={page.ctaLabel} ctaHref={page.ctaHref} />
      </Box>
      <SiteFooter />
      <FloatingActions />
    </>
  );
}
