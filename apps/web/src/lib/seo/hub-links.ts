import { servicePages } from './service-pages';
import { getLocationPagesByPriority } from './location-pages';
import type { InternalLinkItem } from '@/types/seo';

/**
 * Returns the canonical set of "top services" used to seed internal linking
 * on supporting pages (about, faq, how-it-works, contact). These are the
 * high-intent commercial services that should always be one click away
 * from every page, to consolidate topical authority around the cluster.
 *
 * Order is intentional and matches the user's mental model:
 * 1. The most common emergency (puncture / repair)
 * 2. The most common fallback (replacement)
 * 3. The defining "always available" promise (24-hour)
 * 4. The umbrella service
 */
export function getTopServiceLinks(limit = 4): readonly InternalLinkItem[] {
  const preferred = [
    'emergency-tyre-repair',
    'mobile-tyre-fitting',
    '24-hour-mobile-tyre-fitting',
    'puncture-repair',
  ];
  const map = new Map(servicePages.map((s) => [s.slug, s]));
  const items: InternalLinkItem[] = [];
  for (const slug of preferred) {
    const page = map.get(slug);
    if (page && items.length < limit) {
      items.push({
        label: page.title,
        href: `/services/${page.slug}`,
        description: page.metaDescription,
      });
    }
  }
  // Top up from remaining pages if any preferred slug was missing.
  if (items.length < limit) {
    for (const page of servicePages) {
      if (preferred.includes(page.slug)) continue;
      if (items.length >= limit) break;
      items.push({
        label: page.title,
        href: `/services/${page.slug}`,
        description: page.metaDescription,
      });
    }
  }
  return items;
}

/**
 * Returns the top-priority location pages as internal link items. Used by
 * supporting pages to push PageRank toward the highest-value city pages.
 */
export function getTopLocationLinks(limit = 4): readonly InternalLinkItem[] {
  return getLocationPagesByPriority(1)
    .slice(0, limit)
    .map((p) => ({
      label: `${p.city} mobile tyre fitting`,
      href: `/locations/${p.slug}`,
      description: p.region,
    }));
}
