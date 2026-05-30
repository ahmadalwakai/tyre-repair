import type { Metadata } from 'next';
import { GoogleAdsLandingHero } from '@/components/landing/GoogleAdsLandingHero';
import { CoverageZoneSummary } from '@/components/landing/CoverageZoneSummary';
import { ServiceJsonLd } from '@/components/seo/ServiceJsonLd';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import {
  generateAdminEditableMetadata,
  getEffectiveSeoOrDefaults,
} from '@/lib/seo/page-helpers';

const PATH = '/lp/emergency-mobile-tyre-fitting';

export async function generateMetadata(): Promise<Metadata> {
  return generateAdminEditableMetadata(PATH);
}

export default async function EmergencyMobileTyreFittingLandingPage() {
  const seo = await getEffectiveSeoOrDefaults(PATH);
  return (
    <>
      <LocalBusinessJsonLd />
      <ServiceJsonLd
        name="Emergency mobile tyre fitting"
        description={seo?.description ?? ''}
        pathname={PATH}
        serviceType="Emergency mobile tyre fitting"
      />
      <GoogleAdsLandingHero
        eyebrow="24/7 emergency mobile tyres"
        headline={seo?.h1 ?? 'Emergency mobile tyre fitting in Scotland'}
        subheadline={
          seo?.intro ??
          'Stuck with a flat, puncture or blowout? Check your postcode for live dispatch availability, then call to get a van on the way.'
        }
        trustBullets={[
          'We come to you',
          'Scotland-wide service area',
          'Repair-first assessment',
          'No fake arrival times',
        ]}
        source="lp_emergency_mobile_tyre_fitting"
        intent="emergency_mobile_tyre_fitting"
        footnote="Response windows are typical dispatch ranges, not guaranteed arrival times."
      />
      <CoverageZoneSummary />
    </>
  );
}
