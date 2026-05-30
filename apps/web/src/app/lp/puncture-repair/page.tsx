import type { Metadata } from 'next';
import { GoogleAdsLandingHero } from '@/components/landing/GoogleAdsLandingHero';
import { CoverageZoneSummary } from '@/components/landing/CoverageZoneSummary';
import { ServiceJsonLd } from '@/components/seo/ServiceJsonLd';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import {
  generateAdminEditableMetadata,
  getEffectiveSeoOrDefaults,
} from '@/lib/seo/page-helpers';

const PATH = '/lp/puncture-repair';

export async function generateMetadata(): Promise<Metadata> {
  return generateAdminEditableMetadata(PATH);
}

export default async function PunctureRepairLandingPage() {
  const seo = await getEffectiveSeoOrDefaults(PATH);
  return (
    <>
      <LocalBusinessJsonLd />
      <ServiceJsonLd
        name="Mobile puncture repair"
        description={seo?.description ?? ''}
        pathname={PATH}
        serviceType="Mobile puncture repair"
      />
      <GoogleAdsLandingHero
        eyebrow="Mobile puncture repair"
        headline={seo?.h1 ?? 'Mobile puncture repair in Scotland'}
        subheadline={
          seo?.intro ??
          'Check your postcode for live availability. If your tyre cannot be safely repaired we will tell you on site and confirm replacement before fitting.'
        }
        trustBullets={[
          'Repair-first assessment',
          'No upsell',
          'Replacement only if unsafe to repair',
        ]}
        source="lp_puncture_repair"
        intent="puncture_repair"
        footnote="We do not guarantee every puncture is repairable. Sidewall damage, run-flats driven on flat and internal cord damage usually require replacement."
      />
      <CoverageZoneSummary />
    </>
  );
}
