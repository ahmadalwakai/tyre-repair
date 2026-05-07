export interface SiteConfig {
  businessName: string;
  domain: string;
  baseUrl: string;
  phoneDisplay: string;
  phoneHref: string;
  whatsappDisplay: string;
  whatsappHref: string;
  address: string;
  hqCity: string;
  coverageCountry: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  whatsappCtaLabel: string;
  tagline: string;
}

export const siteConfig: SiteConfig = {
  businessName: 'TyreRepair UK',
  domain: 'www.tyrerepair.uk',
  baseUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.tyrerepair.uk').replace(/\/$/, ''),
  phoneDisplay: '0141 266 0690',
  phoneHref: 'tel:01412660690',
  whatsappDisplay: '+44 7423 262955',
  whatsappHref: 'https://wa.me/447423262955',
  address: 'Unit 1, 10 Gateside Street, Glasgow G31 1PD',
  hqCity: 'Glasgow',
  coverageCountry: 'Scotland',
  primaryCtaLabel: 'Get Instant Emergency Quote',
  primaryCtaHref: '/quote',
  secondaryCtaLabel: 'Call 0141 266 0690',
  secondaryCtaHref: 'tel:01412660690',
  whatsappCtaLabel: 'WhatsApp Us',
  tagline: '24/7 Mobile Tyre Help',
};
