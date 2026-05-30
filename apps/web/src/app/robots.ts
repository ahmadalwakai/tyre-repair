import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';

/**
 * robots.txt
 *
 * Notes:
 * - `host` directive intentionally removed: it was a Yandex-only hint that
 *   Google ignores, and emitting it produces Search Console warnings.
 * - `/api/`, `/checkout/`, `/track/`, `/location-capture/`, `/pay-balance/`,
 *   `/pay-adjustment/`, `/admin-pay/` and `/tyres/checkout/` are transactional
 *   or per-user and must never be indexed.
 * - AI crawlers are allowed by default; we publish `llms.txt` for an explicit
 *   summary instead of blocking them.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/checkout/',
          '/track/',
          '/location-capture/',
          '/pay-balance/',
          '/pay-adjustment/',
          '/admin-pay/',
          '/tyres/checkout/',
        ],
      },
    ],
    sitemap: `${siteConfig.baseUrl}/sitemap.xml`,
  };
}
