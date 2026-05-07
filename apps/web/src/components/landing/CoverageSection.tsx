import { Box, Stack, Wrap } from '@chakra-ui/react';
import NextLink from 'next/link';
import { FiMapPin } from 'react-icons/fi';
import { SectionShell } from '@/components/ui/SectionShell';
import { GoldBadge } from '@/components/ui/GoldBadge';
import { GoldButton } from '@/components/ui/GoldButton';
import type { CoverageCity } from '@/types/landing';
import { siteConfig } from '@/lib/site-config';

interface CoverageEntry extends CoverageCity {
  slug: string;
}

const CITIES: readonly CoverageEntry[] = [
  { name: 'Glasgow', slug: 'glasgow', isHq: true },
  { name: 'Edinburgh', slug: 'edinburgh' },
  { name: 'Aberdeen', slug: 'aberdeen' },
  { name: 'Dundee', slug: 'dundee' },
  { name: 'Inverness', slug: 'inverness' },
  { name: 'Stirling', slug: 'stirling' },
  { name: 'Perth', slug: 'perth' },
  { name: 'Paisley', slug: 'paisley' },
  { name: 'Falkirk', slug: 'falkirk' },
  { name: 'Fort William', slug: 'fort-william' },
  { name: 'Ayr', slug: 'ayr' },
  { name: 'Hamilton', slug: 'hamilton' },
];

export function CoverageSection() {
  return (
    <SectionShell
      id="coverage"
      eyebrow="Coverage"
      title="Scotland-wide mobile tyre coverage"
      description={`Based from Glasgow, ${siteConfig.businessName} covers the whole of Scotland. Distance is calculated automatically from ${siteConfig.address}.`}
    >
      <Stack gap="6" align="center">
        <Wrap justify="center" gap="2">
          {CITIES.map((c) => (
            <NextLink key={c.slug} href={`/locations/${c.slug}`} prefetch={false}>
              <GoldBadge icon={<FiMapPin />}>
                {c.name}
                {c.isHq ? ' · HQ' : ''}
              </GoldBadge>
            </NextLink>
          ))}
        </Wrap>
        <Box>
          <GoldButton href={siteConfig.primaryCtaHref} size="lg">
            Check my location
          </GoldButton>
        </Box>
      </Stack>
    </SectionShell>
  );
}

export default CoverageSection;
