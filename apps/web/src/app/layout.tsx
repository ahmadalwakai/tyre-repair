import type { Metadata, Viewport } from 'next';
import { Inter, Cinzel } from 'next/font/google';
import { Providers } from './providers';
import { siteConfig } from '@/lib/site-config';
import { buildPageMetadata } from '@/lib/seo';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
  weight: ['400', '600', '700'],
});

const baseMeta = buildPageMetadata({
  title: 'Emergency Mobile Tyre Repair Scotland | TyreRepair UK',
  description:
    '24/7 mobile tyre repair and replacement across Scotland. Emergency flat tyre, puncture and tyre replacement callouts from TyreRepair UK in Glasgow.',
  path: '/',
});

export const metadata: Metadata = {
  ...baseMeta,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl),
  // NOTE: child pages emit titles via `buildSeoMetadata` which sets
  // `title.absolute` to avoid double brand-suffix from the template.
  title: {
    default: 'Emergency Mobile Tyre Repair Scotland | TyreRepair UK',
    template: '%s | TyreRepair UK',
  },
  applicationName: siteConfig.businessName,
  formatDetection: { telephone: true, address: true, email: true },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: siteConfig.businessName,
    statusBarStyle: 'black-translucent',
  },
  category: 'automotive',
  ...(process.env.GOOGLE_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.GOOGLE_SITE_VERIFICATION
            ? { google: process.env.GOOGLE_SITE_VERIFICATION }
            : {}),
          ...(process.env.BING_SITE_VERIFICATION
            ? { other: { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } }
            : {}),
        },
      }
    : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
  ],
  width: 'device-width',
  initialScale: 1,
  // `maximumScale` intentionally omitted. Restricting zoom hurts accessibility
  // and is a documented Lighthouse / Search Console signal. Users must be able
  // to pinch-zoom freely.
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${cinzel.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Preconnect to third-party origins that are required on the critical
          render path for the booking flow. Each preconnect saves ~100-300ms
          on first request by warming DNS + TLS before the script/style is
          actually requested. Only origins we definitely use on most pages.
        */}
        <link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://events.mapbox.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
      </head>
      <body>
        <LocalBusinessJsonLd />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
