import type { LocationPage, ServicePage, ServiceContentSection, ServiceFaqItem } from '@/types/seo';
import { locationPages, findLocationPage } from './location-pages';
import { servicePages, findServicePage } from './service-pages';

/**
 * Service × location combo pages.
 *
 * Strategy:
 *   - Every service slug is combined with every location slug.
 *   - URL pattern: /services/<service-slug>/<location-slug>
 *   - Content is composed from the parent service page + location context,
 *     so we never duplicate the parent service page wholesale (we trim and
 *     re-frame for the city).
 *   - Canonical points to itself. The parent service and parent location
 *     pages remain separately indexed and link into the combo.
 *
 * Why this is safe SEO:
 *   - Each combo carries a unique title, meta description, hero, intro
 *     paragraph, "what we see in <city>" section using the city's
 *     localContext / roadContext / commonCallouts, plus FAQ items that
 *     reference both the service and the city.
 *   - We do not blast the same parent body onto every combo. We pull
 *     the first 1–2 service sections (the "definition" sections that are
 *     genuinely useful for any reader) and add localised sections.
 */

export interface ComboPair {
  service: ServicePage;
  location: LocationPage;
}

/**
 * Returns every service × location pair. Use only inside server code
 * (generateStaticParams, sitemap). Order is stable (service, then location).
 */
export function getAllServiceLocationCombos(): readonly ComboPair[] {
  const out: ComboPair[] = [];
  for (const service of servicePages) {
    for (const location of locationPages) {
      out.push({ service, location });
    }
  }
  return out;
}

export function findServiceLocationCombo(
  serviceSlug: string,
  locationSlug: string,
): ComboPair | undefined {
  const service = findServicePage(serviceSlug);
  const location = findLocationPage(locationSlug);
  if (!service || !location) return undefined;
  return { service, location };
}

export interface ComboCopy {
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroIntro: string;
  primaryKeywords: readonly string[];
  sections: readonly ServiceContentSection[];
  faq: readonly ServiceFaqItem[];
}

/**
 * Build the page copy for a combo from its parent service + location.
 */
export function buildComboCopy({ service, location }: ComboPair): ComboCopy {
  const cityLabel = location.city;
  const regionLabel = location.region;

  const metaTitle = `${service.title} in ${cityLabel} | TyreRepair UK`;
  const metaDescription = buildComboMetaDescription(service, location);

  const heroTitle = `${service.title} in ${cityLabel}`;
  const heroIntro = `${service.heroIntro} ${cityLabel} is part of our regular ${regionLabel} cover — the same mobile fleet, dispatched to your location.`;

  // Pull the first 1–2 service sections (definition / how-it-works) so the
  // combo page still leads with substantive content, then add localised
  // sections so the URL is genuinely about <service> + <city>, not a clone.
  const parentSections = service.sections.slice(0, 2);

  const localisedSections: ServiceContentSection[] = [
    {
      heading: `${service.title} for ${cityLabel} drivers`,
      body: [
        `${cityLabel} sits in ${regionLabel}. ${location.localContext}`,
        `For ${cityLabel}, ${service.title.toLowerCase()} call outs typically follow the same pattern we see across ${regionLabel}: ${location.commonCallouts.slice(0, 3).join(', ')}.`,
      ],
    },
    {
      heading: `Roads and routes around ${cityLabel}`,
      body: [
        `Tyre damage in and around ${cityLabel} most often happens on ${location.roadContext.join(', ')}. The mobile service comes to you wherever the vehicle is — driveway, work car park, supermarket, or roadside (where it is safe to work).`,
      ],
      bullets: location.roadContext.map((r) => `${r} corridor`),
    },
    {
      heading: `Out-of-hours ${service.title.toLowerCase()} in ${cityLabel}`,
      body: [
        `Local tyre shops in and around ${cityLabel} keep mainly daytime hours. ${service.title} via the mobile fleet covers evenings, nights, weekends and bank holidays. Pricing for unsocial hours is shown clearly in the quote before you pay.`,
      ],
    },
  ];

  const sections: ServiceContentSection[] = [...parentSections, ...localisedSections];

  const localisedFaq: ServiceFaqItem[] = [
    {
      question: `Do you do ${service.title.toLowerCase()} in ${cityLabel}?`,
      answer: `Yes — ${cityLabel} is part of our regular ${regionLabel} cover. We dispatch to ${cityLabel} as part of our Scotland-wide mobile service. Travel time is honest and always confirmed in the quote before you commit.`,
    },
    {
      question: `Can you come out at night to ${cityLabel}?`,
      answer: `Yes — late-night, weekend and bank holiday call outs are part of the 24/7 mobile service in ${cityLabel}. Out-of-hours pricing is shown clearly in the quote before payment.`,
    },
    {
      question: `How quickly can you reach ${cityLabel}?`,
      answer: `Real-world dispatch depends on traffic, weather and how busy we are. We are honest about timing on the call rather than promising a number we cannot guarantee for ${cityLabel}.`,
    },
    // Keep one or two parent service FAQs so the page still answers core
    // questions about the service itself.
    ...service.faq.slice(0, 2),
  ];

  const primaryKeywords = [
    `${service.title.toLowerCase()} ${cityLabel}`,
    `${service.title.toLowerCase()} near ${cityLabel}`,
    `mobile ${service.title.toLowerCase()} ${cityLabel}`,
    `${service.title.toLowerCase()} ${regionLabel}`,
    ...service.primaryKeywords.slice(0, 2),
  ];

  return {
    metaTitle,
    metaDescription,
    heroTitle,
    heroIntro,
    primaryKeywords,
    sections,
    faq: localisedFaq,
  };
}

function buildComboMetaDescription(service: ServicePage, location: LocationPage): string {
  const base = `${service.title} in ${location.city}, ${location.region}. Mobile tyre fleet covering ${location.region} — at home, at work or roadside, day or night.`;
  // Cap at ~165 chars to keep clean in SERP.
  return base.length <= 165 ? base : `${base.slice(0, 162).trimEnd()}…`;
}
