import type { Metadata } from 'next';
import { siteConfig } from '@/lib/site-config';
import type { SeoPageMetadata } from '@/types/seo';
import { getCanonicalUrl } from './canonical';

const DEFAULT_OG_IMAGE = '/opengraph-image';
const DEFAULT_TWITTER_IMAGE = '/twitter-image';

export function buildOpenGraphImageAlt(title: string): string {
  return `${title} — ${siteConfig.businessName}`;
}

function imageDescriptor(path: string, alt: string) {
  return [
    {
      url: path,
      width: 1200,
      height: 630,
      alt,
    },
  ];
}

/**
 * Build a fully-formed `Metadata` object for an indexable public page.
 *
 * - `title` is rendered as-is (the root layout supplies the `%s` template).
 * - `description` should be 140–170 chars for best SERP truncation.
 * - `path` is the public pathname (e.g. `/services/puncture-repair`).
 *
 * The helper sets `index/follow`, the `en-GB` locale alternate, OpenGraph
 * + Twitter cards, and a self-canonical URL — every public SEO page should
 * use this so canonicalisation cannot drift.
 */
export function buildSeoMetadata(input: SeoPageMetadata): Metadata {
  const url = getCanonicalUrl(input.path);
  const ogImagePath = input.ogImagePath ?? DEFAULT_OG_IMAGE;
  const twitterImagePath = input.ogImagePath ?? DEFAULT_TWITTER_IMAGE;
  const alt = buildOpenGraphImageAlt(input.title);

  const md: Metadata = {
    // `absolute` bypasses the root layout's `'%s | TyreRepair UK'` template so
    // page titles that already include the brand suffix don't get the brand
    // appended twice (`... | TyreRepair UK | TyreRepair UK`).
    title: { absolute: input.title },
    description: input.description,
    alternates: {
      canonical: url,
      languages: {
        'en-GB': url,
        'x-default': url,
      },
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: siteConfig.businessName,
      locale: 'en_GB',
      type: 'website',
      images: imageDescriptor(ogImagePath, alt),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: imageDescriptor(twitterImagePath, alt),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
  };

  if (input.keywords && input.keywords.length > 0) {
    md.keywords = [...input.keywords];
  }

  return md;
}

/**
 * Identical to `buildSeoMetadata` but explicitly noindex/nofollow.
 * Use for checkout, tracking, location-capture and other transactional pages.
 */
export function buildNoIndexMetadata(input: SeoPageMetadata): Metadata {
  const url = getCanonicalUrl(input.path);
  return {
    title: { absolute: input.title },
    description: input.description,
    alternates: { canonical: url },
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}
