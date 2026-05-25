import type {
  AboutPage,
  AutomotiveBusiness,
  BreadcrumbList,
  ContactPage,
  EmergencyService,
  FAQPage,
  LocalBusiness,
  Service,
  WebPage,
  WebSite,
  WithContext,
} from 'schema-dts';
import { siteConfig } from '@/lib/site-config';
import type { BreadcrumbItem, ServiceFaqItem, LocationFaqItem } from '@/types/seo';
import { getCanonicalUrl } from './canonical';

const E164_PHONE = '+441412660690';
const HQ_GEO = { latitude: 55.853, longitude: -4.207 } as const;

const HQ_ADDRESS = {
  '@type': 'PostalAddress' as const,
  streetAddress: 'Unit 1, 10 Gateside Street',
  addressLocality: 'Glasgow',
  postalCode: 'G31 1PD',
  addressRegion: 'Scotland',
  addressCountry: 'GB',
};

const ALL_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const OPENING_HOURS = {
  '@type': 'OpeningHoursSpecification' as const,
  dayOfWeek: [...ALL_DAYS],
  opens: '00:00',
  closes: '23:59',
};

/**
 * Returns a strongly-typed JSON-LD graph node representing the business.
 * Multi-typed as LocalBusiness + AutomotiveBusiness + EmergencyService so
 * search engines can match transactional, automotive, and emergency intent.
 *
 * Never includes aggregateRating, review, or fake branch addresses.
 */
export function buildLocalBusinessSchema(): WithContext<LocalBusiness | AutomotiveBusiness | EmergencyService> {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'AutomotiveBusiness', 'EmergencyService'] as unknown as 'LocalBusiness',
    '@id': `${siteConfig.baseUrl}/#business`,
    name: siteConfig.businessName,
    url: siteConfig.baseUrl,
    telephone: E164_PHONE,
    email: 'hello@tyrerepair.uk',
    image: `${siteConfig.baseUrl}/opengraph-image`,
    logo: `${siteConfig.baseUrl}/opengraph-image`,
    description:
      'Mobile tyre fitting and emergency tyre repair from a Glasgow base, covering Scotland 24/7 for flat tyres, punctures, blowouts and tyre replacement at the customer location.',
    address: HQ_ADDRESS,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: HQ_GEO.latitude,
      longitude: HQ_GEO.longitude,
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Scotland',
    },
    openingHoursSpecification: OPENING_HOURS,
    sameAs: [`https://wa.me/447423262955`],
  };
}

export function buildWebsiteSchema(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.baseUrl}/#website`,
    url: siteConfig.baseUrl,
    name: siteConfig.businessName,
    inLanguage: 'en-GB',
    publisher: { '@id': `${siteConfig.baseUrl}/#business` },
  };
}

export interface ServiceSchemaInput {
  name: string;
  description: string;
  pathname: string;
  serviceType?: string;
  areaServedName?: string;
}

export function buildServiceSchema(input: ServiceSchemaInput): WithContext<Service> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    serviceType: input.serviceType ?? 'Mobile tyre fitting',
    url: getCanonicalUrl(input.pathname),
    provider: { '@id': `${siteConfig.baseUrl}/#business` },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: input.areaServedName ?? 'Scotland',
    },
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: `${siteConfig.baseUrl}/quote`,
      servicePhone: {
        '@type': 'ContactPoint',
        telephone: E164_PHONE,
        contactType: 'customer service',
      },
      availableLanguage: 'en-GB',
    },
  };
}

export interface LocationLocalBusinessInput {
  city: string;
  region: string;
  pathname: string;
  description: string;
}

/**
 * LocalBusiness node for a location page.
 *
 * IMPORTANT: address always points back to the real Glasgow HQ. `areaServed`
 * is the city/region the page targets. We never invent a branch address.
 */
export function buildLocationLocalBusinessSchema(
  input: LocationLocalBusinessInput,
): WithContext<LocalBusiness> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `${siteConfig.businessName} — mobile cover for ${input.city}`,
    url: getCanonicalUrl(input.pathname),
    telephone: E164_PHONE,
    image: `${siteConfig.baseUrl}/opengraph-image`,
    description: input.description,
    address: HQ_ADDRESS,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: HQ_GEO.latitude,
      longitude: HQ_GEO.longitude,
    },
    areaServed: [
      { '@type': 'City', name: input.city },
      { '@type': 'AdministrativeArea', name: input.region },
    ],
    openingHoursSpecification: OPENING_HOURS,
  };
}

export function buildFaqSchema(items: readonly (ServiceFaqItem | LocationFaqItem)[]): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: it.answer,
      },
    })),
  };
}

export function buildBreadcrumbSchema(items: readonly BreadcrumbItem[]): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.name,
      item: getCanonicalUrl(it.href),
    })),
  };
}

export interface SimplePageSchemaInput {
  name: string;
  description: string;
  pathname: string;
}

/**
 * AboutPage JSON-LD that references the global LocalBusiness `@id`.
 * Contains no reviews, ratings or fake branches.
 */
export function buildAboutPageSchema(input: SimplePageSchemaInput): WithContext<AboutPage> {
  const url = getCanonicalUrl(input.pathname);
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${url}#aboutpage`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: 'en-GB',
    isPartOf: { '@id': `${siteConfig.baseUrl}/#website` },
    about: { '@id': `${siteConfig.baseUrl}/#business` },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: `${siteConfig.baseUrl}/opengraph-image`,
    },
  };
}

/**
 * ContactPage JSON-LD with a contactPoint pointing at the real Glasgow HQ
 * phone number. References the global LocalBusiness `@id`.
 */
export function buildContactPageSchema(input: SimplePageSchemaInput): WithContext<ContactPage> {
  const url = getCanonicalUrl(input.pathname);
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${url}#contactpage`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: 'en-GB',
    isPartOf: { '@id': `${siteConfig.baseUrl}/#website` },
    about: { '@id': `${siteConfig.baseUrl}/#business` },
    mainEntity: {
      '@type': 'Organization',
      '@id': `${siteConfig.baseUrl}/#business`,
      name: siteConfig.businessName,
      url: siteConfig.baseUrl,
      address: HQ_ADDRESS,
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: E164_PHONE,
          contactType: 'customer service',
          areaServed: 'GB',
          availableLanguage: 'en-GB',
        },
      ],
    },
  };
}

/**
 * Generic WebPage JSON-LD. Use for trust pages where AboutPage / ContactPage
 * are not appropriate (e.g. /how-it-works). No fake duration, price or ETA.
 */
export function buildWebPageSchema(input: SimplePageSchemaInput): WithContext<WebPage> {
  const url = getCanonicalUrl(input.pathname);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: 'en-GB',
    isPartOf: { '@id': `${siteConfig.baseUrl}/#website` },
    about: { '@id': `${siteConfig.baseUrl}/#business` },
  };
}
