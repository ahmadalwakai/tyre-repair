import type { SeoPageDefaults } from './recommendations';

/**
 * Registry of indexable public pages whose SEO is admin-editable.
 *
 * The `defaults` here are the canonical fall-back values used when no row
 * exists in `seo_page_settings`. Admins can override any field, and the
 * recommendations engine scores the *effective* values (override ?? default).
 *
 * To make another public page admin-editable, add an entry here and read
 * its metadata via `getEffectiveSeoForPath(path)` in the page's
 * `generateMetadata` export.
 */
export const SEO_PAGE_REGISTRY: readonly SeoPageDefaults[] = [
  {
    path: '/lp/mobile-tyre-fitting',
    label: 'LP — Mobile tyre fitting (Scotland)',
    title: 'Mobile Tyre Fitting Across Scotland | TyreRepair UK',
    description:
      'Mobile tyre fitting that comes to you anywhere in Scotland. Check your postcode for live dispatch availability and call to confirm the price before dispatch.',
    h1: 'Mobile tyre fitting that comes to you in Scotland',
    intro:
      'Home, workplace or roadside. Enter your postcode to see if we can dispatch to your area today.',
    keywords: [
      'mobile tyre fitting',
      'mobile tyre fitting Scotland',
      'tyre replacement at home',
    ],
  },
  {
    path: '/lp/emergency-mobile-tyre-fitting',
    label: 'LP — Emergency mobile tyre fitting',
    title: 'Emergency Mobile Tyre Fitting | 24/7 Dispatch | TyreRepair UK',
    description:
      'Stranded with a flat or blowout? Our emergency mobile tyre fitting team dispatches across central Scotland. Check your postcode for live availability.',
    h1: 'Emergency mobile tyre fitting — fast Scotland dispatch',
    intro:
      'Roadside, home or workplace. Enter your postcode for a live dispatch window — we will confirm the price before we move.',
    keywords: [
      'emergency mobile tyre fitting',
      '24/7 tyre fitting Scotland',
      'roadside tyre fitter',
    ],
  },
  {
    path: '/lp/puncture-repair',
    label: 'LP — Puncture repair',
    title: 'Mobile Puncture Repair | British Standard | TyreRepair UK',
    description:
      'Mobile puncture repair from a repair-first fitter. We follow the British Standard for plug-and-patch repairs. Enter your postcode for live availability.',
    h1: 'Mobile puncture repair, done right',
    intro:
      'Repair-first, no upsell. If your tyre is unsafe to repair we will say so before quoting a replacement.',
    keywords: ['puncture repair', 'mobile puncture repair', 'British Standard tyre repair'],
  },
  {
    path: '/lp/same-day-mobile-tyre-fitting',
    label: 'LP — Same-day mobile tyre fitting',
    title: 'Same-Day Mobile Tyre Fitting | Scotland | TyreRepair UK',
    description:
      'Same-day mobile tyre fitting from our Glasgow base. Enter your postcode to see if we can reach you today and to confirm the price before dispatch.',
    h1: 'Same-day mobile tyre fitting in Scotland',
    intro:
      'Book online or call us — we will confirm same-day availability for your postcode before dispatch.',
    keywords: ['same day tyre fitting', 'same day mobile tyre fitting Scotland'],
  },
];

export function getSeoPageDefaults(path: string): SeoPageDefaults | null {
  return SEO_PAGE_REGISTRY.find((p) => p.path === path) ?? null;
}
