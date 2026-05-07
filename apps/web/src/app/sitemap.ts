import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';
import { servicePages } from '@/lib/seo/service-pages';
import { locationPages } from '@/lib/seo/location-pages';

const base = siteConfig.baseUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/quote`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/services`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/coverage`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/locations`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const serviceEntries: MetadataRoute.Sitemap = servicePages.map((p) => ({
    url: `${base}/services/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  const locationEntries: MetadataRoute.Sitemap = locationPages.map((p) => ({
    url: `${base}/locations/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: p.priority === 1 ? 0.85 : p.priority === 2 ? 0.75 : 0.6,
  }));

  return [...staticEntries, ...serviceEntries, ...locationEntries];
}
