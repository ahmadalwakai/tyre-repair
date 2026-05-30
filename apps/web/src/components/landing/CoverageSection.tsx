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
      description={`${siteConfig.businessName} runs a mobile fleet of vans and drivers covering the whole of Scotland — we come to you. Travel time to your location is calculated automatically.`}
      backgroundImage="/images/sections/coverage-wheel-light.jpg"
      backgroundAlt="Car wheel on the road, mobile tyre fitting across Scotland"
    >
      <Stack
        gap="6"
        align="center"
        p={{ base: '6', md: '8' }}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="accent.neon"
        bg="bg.canvas"
        boxShadow="0 0 0 1px rgba(240,24,37,0.35), 0 0 24px rgba(240,24,37,0.28), inset 0 0 14px rgba(240,24,37,0.08)"
        transition="box-shadow 0.25s ease, transform 0.25s ease"
        _hover={{
          boxShadow:
            '0 0 0 1px rgba(240,24,37,0.6), 0 0 32px rgba(240,24,37,0.55), inset 0 0 18px rgba(240,24,37,0.12)',
        }}
      >
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
