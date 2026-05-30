import type { Metadata } from 'next';
import { GoogleAdsLandingHero } from '@/components/landing/GoogleAdsLandingHero';
import { CoverageZoneSummary } from '@/components/landing/CoverageZoneSummary';
import { ServiceJsonLd } from '@/components/seo/ServiceJsonLd';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import {
  generateAdminEditableMetadata,
  getEffectiveSeoOrDefaults,
} from '@/lib/seo/page-helpers';

const PATH = '/lp/mobile-tyre-fitting';

export async function generateMetadata(): Promise<Metadata> {
  return generateAdminEditableMetadata(PATH);
}

export default async function MobileTyreFittingLandingPage() {
  const seo = await getEffectiveSeoOrDefaults(PATH);
  return (
    <>
      <LocalBusinessJsonLd />
      <ServiceJsonLd
        name="Mobile tyre fitting"
        description={seo?.description ?? ''}
        pathname={PATH}
        serviceType="Mobile tyre fitting"
      />
      <GoogleAdsLandingHero
        eyebrow="Mobile tyre fitting"
        headline={seo?.h1 ?? 'Mobile tyre fitting that comes to you in Scotland'}
        subheadline={
          seo?.intro ??
          'Home, workplace or roadside. Enter your postcode to see if we can dispatch to your area today.'
        }
        trustBullets={[
          'Fitted at your location',
          'Scotland-wide coverage',
          'Honest, repair-first advice',
          'No upsell',
        ]}
        source="lp_mobile_tyre_fitting"
        intent="mobile_tyre_fitting"
      />
      <CoverageZoneSummary />
    </>
  );
}
