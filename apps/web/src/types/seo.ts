import type { ReactNode } from 'react';

export interface SeoPageMetadata {
  title: string;
  description: string;
  path: string;
  keywords?: readonly string[];
  noIndex?: boolean;
  ogImagePath?: string;
}

export interface KeywordGroup {
  id: string;
  label: string;
  intent: string;
  keywords: readonly string[];
  mappedPaths: readonly string[];
}

export interface ServiceFaqItem {
  question: string;
  answer: string;
}

export interface ServiceContentSection {
  heading: string;
  body: readonly string[];
  bullets?: readonly string[];
  callout?: string;
}

export interface ServicePage {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroIntro: string;
  primaryKeywords: readonly string[];
  secondaryKeywords: readonly string[];
  sections: readonly ServiceContentSection[];
  faq: readonly ServiceFaqItem[];
  relatedServices: readonly string[];
  relatedLocations: readonly string[];
  ctaLabel: string;
  ctaHref: string;
}

export interface LocationFaqItem {
  question: string;
  answer: string;
}

export interface LocationContentSection {
  heading: string;
  body: readonly string[];
  bullets?: readonly string[];
}

export interface LocationPage {
  slug: string;
  city: string;
  region: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroIntro: string;
  primaryKeywords: readonly string[];
  secondaryKeywords: readonly string[];
  localContext: string;
  roadContext: readonly string[];
  nearbyAreas: readonly string[];
  commonCallouts: readonly string[];
  contentSections: readonly LocationContentSection[];
  faq: readonly LocationFaqItem[];
  relatedServices: readonly string[];
  nearbyLocationSlugs: readonly string[];
  /** 1 = priority/major page, 2 = standard, 3 = light */
  priority: 1 | 2 | 3;
}

export interface GuideFaqItem {
  question: string;
  answer: string;
}

export interface GuidePage {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroIntro: string;
  sections: readonly ServiceContentSection[];
  faq: readonly GuideFaqItem[];
  relatedServiceSlug?: string;
}

export interface BreadcrumbItem {
  name: string;
  href: string;
}

export interface InternalLinkItem {
  label: string;
  href: string;
  description?: string;
  icon?: ReactNode;
}

export interface SchemaGraphInput {
  url: string;
  name: string;
  description?: string;
}
