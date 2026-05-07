import { Container, Stack, Text } from '@chakra-ui/react';
import type { LocationContentSection, LocationPage } from '@/types/seo';
import { ContentSection } from '@/components/content/ContentSection';
import { ContentCallout } from '@/components/content/ContentCallout';

export interface LocationContentProps {
  page: LocationPage;
}

export function LocationContent({ page }: LocationContentProps) {
  const sections: readonly LocationContentSection[] = page.contentSections;
  return (
    <Container maxW="3xl" px={{ base: '4', md: '6' }} py={{ base: '8', md: '12' }}>
      <Stack gap={{ base: '8', md: '10' }}>
        <ContentCallout>
          {`We are a Glasgow-based mobile tyre fitter operating from Unit 1, 10 Gateside Street, Glasgow G31 1PD. ${page.city} is part of our regular ${page.region} cover — we travel to you, we do not run a branch in ${page.city}.`}
        </ContentCallout>

        <ContentSection
          heading={`Local context for ${page.city}`}
          paragraphs={[page.localContext]}
        />

        {page.roadContext.length > 0 ? (
          <ContentSection
            heading={`Roads and routes affecting ${page.city} tyre call outs`}
            paragraphs={[
              `The arterial roads that drive most tyre call outs around ${page.city} are below. Pothole damage, kerb strikes and motorway debris are the regular causes.`,
            ]}
            bullets={page.roadContext}
          />
        ) : null}

        {page.commonCallouts.length > 0 ? (
          <ContentSection
            heading={`Common ${page.city} call outs`}
            paragraphs={[`The most frequent reasons ${page.city} drivers contact us:`]}
            bullets={page.commonCallouts}
          />
        ) : null}

        {sections.map((s) => (
          <ContentSection
            key={s.heading}
            heading={s.heading}
            paragraphs={s.body}
            {...(s.bullets ? { bullets: s.bullets } : {})}
          />
        ))}

        {page.nearbyAreas.length > 0 ? (
          <Stack gap="2">
            <Text color="accent.neon" fontSize="xs" textTransform="uppercase" letterSpacing="0.14em">
              Nearby areas in {page.region}
            </Text>
            <Text color="fg.muted" fontSize="md" lineHeight="1.6">
              {page.nearbyAreas.join(' · ')}
            </Text>
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
