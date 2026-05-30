import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';
import { servicePages } from '@/lib/seo/service-pages';
import { locationPages } from '@/lib/seo/location-pages';
import { getAllServiceLocationCombos } from '@/lib/seo/service-location-combos';

const base = siteConfig.baseUrl;

// `lastModified` is fixed at build time so it reflects the actual deploy of
// each page, not the time a crawler happened to fetch the sitemap. Reporting a
// fresh `now` on every request looks like a churn signal to Google and is
// treated as low-trust. Re-deploying the site will refresh this value
// naturally.
const BUILD_TIME = new Date();

// `priority` and `changeFrequency` are documented as ignored by Googlebot, so
// we omit them everywhere. Bing still reads them lightly, but they offer no
// upside compared to keeping the file lean.
export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: BUILD_TIME },
    { url: `${base}/quote`, lastModified: BUILD_TIME },
    { url: `${base}/services`, lastModified: BUILD_TIME },
    { url: `${base}/coverage`, lastModified: BUILD_TIME },
    { url: `${base}/locations`, lastModified: BUILD_TIME },
    { url: `${base}/about`, lastModified: BUILD_TIME },
    { url: `${base}/contact`, lastModified: BUILD_TIME },
    { url: `${base}/how-it-works`, lastModified: BUILD_TIME },
    { url: `${base}/faq`, lastModified: BUILD_TIME },
    { url: `${base}/cancellation-policy`, lastModified: BUILD_TIME },
    { url: `${base}/tyres`, lastModified: BUILD_TIME },
  ];

  const serviceEntries: MetadataRoute.Sitemap = servicePages.map((p) => ({
    url: `${base}/services/${p.slug}`,
    lastModified: BUILD_TIME,
  }));

  const locationEntries: MetadataRoute.Sitemap = locationPages.map((p) => ({
    url: `${base}/locations/${p.slug}`,
    lastModified: BUILD_TIME,
  }));

  const comboEntries: MetadataRoute.Sitemap = getAllServiceLocationCombos().map(
    ({ service, location }) => ({
      url: `${base}/services/${service.slug}/${location.slug}`,
      lastModified: BUILD_TIME,
    }),
  );

  return [...staticEntries, ...serviceEntries, ...locationEntries, ...comboEntries];
}
