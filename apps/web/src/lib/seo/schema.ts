import type {
  AboutPage,
  AutomotiveBusiness,
  BreadcrumbList,
  ContactPage,
  EmergencyService,
  FAQPage,
  LocalBusiness,
  Organization,
  Service,
  WebPage,
  WebSite,
  WithContext,
} from 'schema-dts';
import { siteConfig } from '@/lib/site-config';
import type { BreadcrumbItem, ServiceFaqItem, LocationFaqItem } from '@/types/seo';
import { getCanonicalUrl } from './canonical';

const E164_PHONE = '+441412660690';
// Geocoded from `Unit 1, 10 Gateside Street, Glasgow G31 1PD` so the `geo`
// node matches the postal address Google sees on the same page.
const HQ_GEO = { latitude: 55.8569, longitude: -4.2178 } as const;

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
 * Explicit service radius for the mobile (service-area) business. Google's
 * "near me" ranking gives strong weight to a declared `GeoCircle` because
 * it lets the algorithm match the searcher's location against a real
 * coverage polygon instead of guessing from address-only signals.
 *
 * Radius is in METRES. ~120 km from Glasgow HQ covers the central belt
 * (Glasgow, Edinburgh, Stirling, Falkirk, Fife, Ayrshire, Lanarkshire,
 * Borders north edge) which is where the vast majority of mobile jobs
 * actually land within a reasonable response time. Pages for Highlands /
 * Aberdeen / Inverness still declare their own areaServed.
 */
const SERVICE_RADIUS_METRES = 120_000;

const PRIMARY_SERVICE_AREA = {
  '@type': 'GeoCircle' as const,
  geoMidpoint: {
    '@type': 'GeoCoordinates' as const,
    latitude: HQ_GEO.latitude,
    longitude: HQ_GEO.longitude,
  },
  geoRadius: SERVICE_RADIUS_METRES,
};

/**
 * Coordinates and target radius for every Scottish hub we want declared as
 * a credible "near me" service area. Radii are in METRES and reflect the
 * realistic mobile dispatch reach from each hub — not a marketing claim.
 *
 * Glasgow HQ already covers the central belt via PRIMARY_SERVICE_AREA, so
 * the secondary entries focus on regions a 120 km Glasgow circle does NOT
 * reach: Highlands, north-east, Argyll, Tayside, Grampian.
 *
 * Coordinates verified against Ordnance Survey / Wikipedia centroids. Do
 * not invent towns we cannot actually reach.
 */
const CITY_COORDS = {
  glasgow: { latitude: 55.8642, longitude: -4.2518, radiusMetres: 35_000 },
  edinburgh: { latitude: 55.9533, longitude: -3.1883, radiusMetres: 30_000 },
  stirling: { latitude: 56.1165, longitude: -3.9369, radiusMetres: 30_000 },
  falkirk: { latitude: 56.0019, longitude: -3.7839, radiusMetres: 20_000 },
  perth: { latitude: 56.3950, longitude: -3.4308, radiusMetres: 35_000 },
  dundee: { latitude: 56.4620, longitude: -2.9707, radiusMetres: 30_000 },
  aberdeen: { latitude: 57.1497, longitude: -2.0943, radiusMetres: 35_000 },
  inverness: { latitude: 57.4778, longitude: -4.2247, radiusMetres: 50_000 },
  'fort-william': { latitude: 56.8198, longitude: -5.1052, radiusMetres: 60_000 },
  oban: { latitude: 56.4153, longitude: -5.4719, radiusMetres: 40_000 },
  aviemore: { latitude: 57.1908, longitude: -3.8254, radiusMetres: 35_000 },
  elgin: { latitude: 57.6498, longitude: -3.3187, radiusMetres: 30_000 },
  paisley: { latitude: 55.8456, longitude: -4.4239, radiusMetres: 20_000 },
  'east-kilbride': { latitude: 55.7644, longitude: -4.1770, radiusMetres: 20_000 },
  ayr: { latitude: 55.4586, longitude: -4.6292, radiusMetres: 25_000 },
  kilmarnock: { latitude: 55.6117, longitude: -4.4956, radiusMetres: 20_000 },
  dumfries: { latitude: 55.0701, longitude: -3.6053, radiusMetres: 30_000 },
  galashiels: { latitude: 55.6164, longitude: -2.8083, radiusMetres: 30_000 },
  helensburgh: { latitude: 56.0050, longitude: -4.7344, radiusMetres: 25_000 },
  livingston: { latitude: 55.9027, longitude: -3.5230, radiusMetres: 20_000 },
  motherwell: { latitude: 55.7878, longitude: -3.9931, radiusMetres: 15_000 },
  hamilton: { latitude: 55.7779, longitude: -4.0382, radiusMetres: 15_000 },
  kirkcaldy: { latitude: 56.1116, longitude: -3.1672, radiusMetres: 20_000 },
  dunfermline: { latitude: 56.0719, longitude: -3.4525, radiusMetres: 20_000 },
  greenock: { latitude: 55.9489, longitude: -4.7611, radiusMetres: 18_000 },
} as const satisfies Record<
  string,
  { latitude: number; longitude: number; radiusMetres: number }
>;

export type LocationCoordsKey = keyof typeof CITY_COORDS;

/** Returns coords for a known slug, or `undefined` if we don't have them. */
export function getLocationCoords(slug: string):
  | { latitude: number; longitude: number; radiusMetres: number }
  | undefined {
  return (CITY_COORDS as Record<string, (typeof CITY_COORDS)[LocationCoordsKey]>)[slug];
}

function buildGeoCircle(
  coords: { latitude: number; longitude: number; radiusMetres: number },
) {
  return {
    '@type': 'GeoCircle' as const,
    geoMidpoint: {
      '@type': 'GeoCoordinates' as const,
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
    geoRadius: coords.radiusMetres,
  };
}

/**
 * Every hub circle we want Google to see for the global LocalBusiness.
 * Includes Glasgow HQ (also the primary) plus all major Highlands /
 * north-east / Tayside hubs that fall outside the 120 km central-belt
 * circle — Inverness, Fort William, Oban, Aviemore, Aberdeen, Dundee,
 * Perth, Elgin. This is the single biggest signal for `<service> near me`
 * searches originating outside the central belt.
 */
const ALL_HUB_SERVICE_AREAS = [
  PRIMARY_SERVICE_AREA,
  buildGeoCircle(CITY_COORDS.inverness),
  buildGeoCircle(CITY_COORDS['fort-william']),
  buildGeoCircle(CITY_COORDS.oban),
  buildGeoCircle(CITY_COORDS.aviemore),
  buildGeoCircle(CITY_COORDS.aberdeen),
  buildGeoCircle(CITY_COORDS.dundee),
  buildGeoCircle(CITY_COORDS.perth),
  buildGeoCircle(CITY_COORDS.elgin),
];

/**
 * Static list of the priority services we want surfaced in the Place panel
 * / Knowledge Graph. Each entry maps to a real `/services/<slug>` page so
 * the offer URLs resolve. No prices are pinned because the dynamic pricing
 * engine owns that — we only declare `priceCurrency` and `availability`.
 */
const PRIMARY_OFFER_CATALOG_ITEMS = [
  {
    name: 'Mobile tyre fitting',
    slug: 'mobile-tyre-fitting',
    description:
      'Mobile tyre fitter that comes to your home, work or roadside anywhere in Scotland.',
  },
  {
    name: 'Emergency tyre repair',
    slug: 'emergency-tyre-repair',
    description:
      '24/7 emergency response for flat tyres, punctures and blowouts at your location.',
  },
  {
    name: '24 hour mobile tyre fitting',
    slug: '24-hour-mobile-tyre-fitting',
    description:
      'Round-the-clock mobile tyre fitting including nights, weekends and bank holidays.',
  },
  {
    name: 'Puncture repair',
    slug: 'puncture-repair',
    description:
      'Honest repair-first puncture assessment, with replacement only if the tyre is not safely repairable.',
  },
  {
    name: 'Run-flat tyre replacement',
    slug: 'run-flat-tyres',
    description:
      'Run-flat tyre replacement at the customer location with the correct load and speed rating.',
  },
] as const;

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
    legalName: siteConfig.businessName,
    alternateName: ['Tyre Repair UK', 'TyreRepair Glasgow'],
    slogan: '24/7 mobile tyre help across Scotland — repair first, replace if needed.',
    url: siteConfig.baseUrl,
    telephone: E164_PHONE,
    email: 'hello@tyrerepair.uk',
    image: `${siteConfig.baseUrl}/opengraph-image`,
    logo: `${siteConfig.baseUrl}/opengraph-image`,
    description:
      'Scotland-wide mobile tyre fitting and emergency tyre repair, covering the whole country 24/7 for flat tyres, punctures, blowouts and tyre replacement at the customer location.',
    address: HQ_ADDRESS,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: HQ_GEO.latitude,
      longitude: HQ_GEO.longitude,
    },
    areaServed: [
      ...ALL_HUB_SERVICE_AREAS,
      { '@type': 'AdministrativeArea', name: 'Scotland' },
      { '@type': 'AdministrativeArea', name: 'Scottish Highlands' },
      { '@type': 'City', name: 'Glasgow' },
      { '@type': 'City', name: 'Edinburgh' },
      { '@type': 'City', name: 'Stirling' },
      { '@type': 'City', name: 'Paisley' },
      { '@type': 'City', name: 'East Kilbride' },
      { '@type': 'City', name: 'Perth' },
      { '@type': 'City', name: 'Dundee' },
      { '@type': 'City', name: 'Aberdeen' },
      { '@type': 'City', name: 'Inverness' },
      { '@type': 'City', name: 'Fort William' },
      { '@type': 'City', name: 'Oban' },
      { '@type': 'City', name: 'Aviemore' },
      { '@type': 'City', name: 'Elgin' },
    ],
    // `serviceArea` is the modern (and Google-preferred for SAB) twin of
    // `areaServed`. Declaring an explicit list of `GeoCircle` regions here
    // is the single strongest schema signal for "<service> near me" ranking
    // because it tells Google the exact hubs from which we will dispatch a
    // van. Without per-hub circles, a searcher in Fort William or Inverness
    // sits ~150 km / ~270 km from the Glasgow HQ pin and gets filtered out
    // of the "near me" candidate set.
    serviceArea: ALL_HUB_SERVICE_AREAS,
    openingHoursSpecification: OPENING_HOURS,
    // Required for Local Pack / Maps rich card eligibility.
    priceRange: '££',
    currenciesAccepted: 'GBP',
    paymentAccepted: 'Cash, Credit Card, Debit Card, Apple Pay, Google Pay',
    knowsLanguage: ['en-GB'],
    knowsAbout: [
      'mobile tyre fitting',
      'emergency tyre repair',
      'puncture repair',
      'tyre replacement',
      'run-flat tyres',
      'locking wheel nut removal',
      '24/7 roadside tyre assistance',
    ],
    // `hasOfferCatalog` lets the Place panel show our core services as
    // clickable entries with their own page URLs. Each `Offer` keeps prices
    // open because the dynamic pricing engine owns the real number, but the
    // catalog itself materially improves topical authority for the brand
    // and the matched service keywords.
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Mobile tyre services',
      itemListElement: PRIMARY_OFFER_CATALOG_ITEMS.map((item) => ({
        '@type': 'Offer',
        url: `${siteConfig.baseUrl}/services/${item.slug}`,
        priceCurrency: 'GBP',
        availability: 'https://schema.org/InStock',
        itemOffered: {
          '@type': 'Service',
          name: item.name,
          description: item.description,
          serviceType: 'Mobile tyre fitting',
          url: `${siteConfig.baseUrl}/services/${item.slug}`,
          provider: { '@id': `${siteConfig.baseUrl}/#business` },
          areaServed: PRIMARY_SERVICE_AREA,
        },
      })),
    },
    makesOffer: PRIMARY_OFFER_CATALOG_ITEMS.map((item) => ({
      '@type': 'Offer',
      url: `${siteConfig.baseUrl}/services/${item.slug}`,
      priceCurrency: 'GBP',
      itemOffered: {
        '@type': 'Service',
        name: item.name,
        url: `${siteConfig.baseUrl}/services/${item.slug}`,
      },
    })),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: E164_PHONE,
        contactType: 'emergency',
        areaServed: 'GB',
        availableLanguage: 'en-GB',
        hoursAvailable: OPENING_HOURS,
      },
      {
        '@type': 'ContactPoint',
        telephone: '+447423262955',
        contactType: 'customer service',
        contactOption: 'TollFree',
        areaServed: 'GB',
        availableLanguage: 'en-GB',
      },
    ],
    // Entity disambiguation signals. `sameAs` is the canonical place Google
    // looks for Knowledge Graph linking.
    sameAs: [
      'https://wa.me/447423262955',
      // TODO: add real, verified profiles once live:
      // 'https://www.facebook.com/<handle>',
      // 'https://www.instagram.com/<handle>',
      // 'https://www.linkedin.com/company/<handle>',
      // 'https://find-and-update.company-information.service.gov.uk/company/<companies-house-number>',
    ],
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

/**
 * Organization node — separate from LocalBusiness so Google can associate the
 * legal entity behind the brand for Knowledge Panel / Brand SERP. Shares the
 * same logo/sameAs/contactPoint as the LocalBusiness but uses a distinct
 * `@id` (`/#organization`). Both nodes coexist safely in the graph.
 */
export function buildOrganizationSchema(): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteConfig.baseUrl}/#organization`,
    name: siteConfig.businessName,
    legalName: siteConfig.businessName,
    alternateName: ['Tyre Repair UK', 'TyreRepair Glasgow'],
    url: siteConfig.baseUrl,
    logo: `${siteConfig.baseUrl}/opengraph-image`,
    email: 'hello@tyrerepair.uk',
    telephone: E164_PHONE,
    address: HQ_ADDRESS,
    areaServed: [{ '@type': 'AdministrativeArea', name: 'Scotland' }],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: E164_PHONE,
        contactType: 'emergency',
        areaServed: 'GB',
        availableLanguage: ['English'],
      },
    ],
    sameAs: [
      'https://wa.me/447423262955',
      // TODO: add Companies House / Facebook / Instagram / LinkedIn when live.
    ],
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
    areaServed: [
      ...ALL_HUB_SERVICE_AREAS,
      {
        '@type': 'AdministrativeArea',
        name: input.areaServedName ?? 'Scotland',
      },
    ],
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
    // `offers` unlocks the price rich-result. We intentionally use a range
    // (`PriceSpecification`) rather than a single price because real cost
    // depends on tyre size, distance, time-of-day and the dynamic pricing
    // engine. No VAT is mentioned (business is not VAT registered).
    offers: {
      '@type': 'Offer',
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      url: `${siteConfig.baseUrl}/quote`,
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'GBP',
        minPrice: 49,
        valueAddedTaxIncluded: false,
      },
      areaServed: {
        '@type': 'AdministrativeArea',
        name: input.areaServedName ?? 'Scotland',
      },
    },
  };
}

export interface LocationLocalBusinessInput {
  city: string;
  region: string;
  pathname: string;
  description: string;
  /**
   * Location slug — used to look up a city-centered `GeoCircle` from
   * `CITY_COORDS`. When provided and known, the page emits a tight
   * city-specific service area (e.g. Fort William → 60 km around Fort
   * William), which is what unlocks "near me" matches for searchers
   * physically in that town. Falls back to the full Scotland hub set
   * when the slug is unknown.
   */
  slug?: string;
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
  const cityCoords = input.slug ? getLocationCoords(input.slug) : undefined;
  const cityCircle = cityCoords ? buildGeoCircle(cityCoords) : undefined;
  // Prefer a city-centered circle when we know real coords for the slug,
  // otherwise fall back to the full hub coverage so we never silently lose
  // a "near me" signal.
  const serviceAreas = cityCircle ? [cityCircle, ...ALL_HUB_SERVICE_AREAS] : ALL_HUB_SERVICE_AREAS;

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `${siteConfig.businessName} — mobile cover for ${input.city}`,
    url: getCanonicalUrl(input.pathname),
    telephone: E164_PHONE,
    image: `${siteConfig.baseUrl}/opengraph-image`,
    description: input.description,
    address: HQ_ADDRESS,
    // `geo` of the LocalBusiness node stays on the real HQ — the location
    // page targets `input.city`, but the registered business address is
    // unchanged. The city-centered signal is carried by `areaServed` /
    // `serviceArea`, which is the schema.org-correct place for it on a
    // service-area business.
    geo: {
      '@type': 'GeoCoordinates',
      latitude: HQ_GEO.latitude,
      longitude: HQ_GEO.longitude,
    },
    areaServed: [
      ...serviceAreas,
      { '@type': 'City', name: input.city },
      { '@type': 'AdministrativeArea', name: input.region },
    ],
    serviceArea: serviceAreas,
    openingHoursSpecification: OPENING_HOURS,
    priceRange: '££',
    currenciesAccepted: 'GBP',
    paymentAccepted: 'Cash, Credit Card, Debit Card',
  };
}

export function buildFaqSchema(items: readonly (ServiceFaqItem | LocationFaqItem)[]): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    // `speakable` helps Google Assistant / AI Overviews surface the answer
    // copy as audio. CSS selector targets the answer `<p>` rendered by the
    // `FaqSection` component.
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['[data-faq-question]', '[data-faq-answer]'],
    },
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: it.answer,
      },
    })),
  } as WithContext<FAQPage>;
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
