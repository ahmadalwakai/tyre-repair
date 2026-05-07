import { siteConfig } from '@/lib/site-config';

/**
 * Build a canonical URL for a given pathname.
 *
 * Rules:
 * - Always anchored to the production base URL.
 * - Strips query strings and hash fragments.
 * - Preserves trailing slash on the homepage only.
 * - Lowercases the path (canonical URLs should be case-stable).
 */
export function getCanonicalUrl(pathname: string): string {
  const base = siteConfig.baseUrl.replace(/\/$/, '');
  if (!pathname || pathname === '/' || pathname === '') return `${base}/`;
  const cleanedNoQuery = pathname.split('?')[0]?.split('#')[0] ?? pathname;
  const withLeadingSlash = cleanedNoQuery.startsWith('/') ? cleanedNoQuery : `/${cleanedNoQuery}`;
  const stripTrailing =
    withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')
      ? withLeadingSlash.slice(0, -1)
      : withLeadingSlash;
  return `${base}${stripTrailing.toLowerCase()}`;
}

export function getCanonicalPath(pathname: string): string {
  if (!pathname || pathname === '/' || pathname === '') return '/';
  const cleaned = pathname.split('?')[0]?.split('#')[0] ?? pathname;
  const withLeadingSlash = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  return withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1).toLowerCase()
    : withLeadingSlash.toLowerCase();
}
