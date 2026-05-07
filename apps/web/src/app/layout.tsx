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
  title: {
    default: 'Emergency Mobile Tyre Repair Scotland | TyreRepair UK',
    template: '%s | TyreRepair UK',
  },
  applicationName: siteConfig.businessName,
  formatDetection: { telephone: true, address: true, email: true },
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
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${cinzel.variable}`} suppressHydrationWarning>
      <body>
        <LocalBusinessJsonLd />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
