import type { Metadata } from 'next';
import { siteConfig } from './site-config';

export interface PageSeoInput {
  title: string;
  description: string;
  path?: string;
}

export function buildPageMetadata(input: PageSeoInput): Metadata {
  const url = `${siteConfig.baseUrl}${input.path ?? '/'}`;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: siteConfig.businessName,
      locale: 'en_GB',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
  };
}

export interface LocalBusinessJsonLd {
  '@context': 'https://schema.org';
  '@type': string[];
  name: string;
  url: string;
  telephone: string;
  address: {
    '@type': 'PostalAddress';
    streetAddress: string;
    addressLocality: string;
    postalCode: string;
    addressCountry: string;
  };
  areaServed: { '@type': 'AdministrativeArea'; name: string };
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification';
    dayOfWeek: string[];
    opens: string;
    closes: string;
  };
  sameAs?: string[];
}

export function buildLocalBusinessJsonLd(): LocalBusinessJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'AutomotiveBusiness', 'EmergencyService'],
    name: siteConfig.businessName,
    url: siteConfig.baseUrl,
    telephone: '+441412660690',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Unit 1, 10 Gateside Street',
      addressLocality: 'Glasgow',
      postalCode: 'G31 1PD',
      addressCountry: 'GB',
    },
    areaServed: { '@type': 'AdministrativeArea', name: 'Scotland' },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
  };
}
