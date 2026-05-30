import type { Metadata } from 'next';
import { GoogleAdsLandingHero } from '@/components/landing/GoogleAdsLandingHero';
import { CoverageZoneSummary } from '@/components/landing/CoverageZoneSummary';
import { ServiceJsonLd } from '@/components/seo/ServiceJsonLd';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import {
  generateAdminEditableMetadata,
  getEffectiveSeoOrDefaults,
} from '@/lib/seo/page-helpers';

const PATH = '/lp/same-day-mobile-tyre-fitting';

export async function generateMetadata(): Promise<Metadata> {
  return generateAdminEditableMetadata(PATH);
}

export default async function SameDayMobileTyreFittingLandingPage() {
  const seo = await getEffectiveSeoOrDefaults(PATH);
  return (
    <>
      <LocalBusinessJsonLd />
      <ServiceJsonLd
        name="Same-day mobile tyre fitting"
        description={seo?.description ?? ''}
        pathname={PATH}
        serviceType="Same-day mobile tyre fitting"
      />
      <GoogleAdsLandingHero
        eyebrow="Same-day dispatch"
        headline={seo?.h1 ?? 'Same-day mobile tyre fitting in Scotland'}
        subheadline={
          seo?.intro ??
          'Enter your postcode to confirm same-day availability in your area, then call to confirm a dispatch slot.'
        }
        trustBullets={[
          'Same-day where capacity allows',
          'Mobile across Scotland',
          'Repair first, replace only if needed',
        ]}
        source="lp_same_day_mobile_tyre_fitting"
        intent="same_day_mobile_tyre_fitting"
        footnote="Same-day cover depends on live van capacity. We confirm a real dispatch window on the call."
      />
      <CoverageZoneSummary />
    </>
  );
}
