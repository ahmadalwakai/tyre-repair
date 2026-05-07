import { Container, Stack } from '@chakra-ui/react';
import type { ServiceContentSection } from '@/types/seo';
import { ContentSection } from '@/components/content/ContentSection';
import { ContentCallout } from '@/components/content/ContentCallout';

export interface ServiceContentProps {
  sections: readonly ServiceContentSection[];
}

export function ServiceContent({ sections }: ServiceContentProps) {
  return (
    <Container maxW="3xl" px={{ base: '4', md: '6' }} py={{ base: '8', md: '12' }}>
      <Stack gap={{ base: '8', md: '10' }}>
        {sections.map((s) => (
          <Stack key={s.heading} gap="3">
            <ContentSection
              heading={s.heading}
              paragraphs={s.body}
              {...(s.bullets ? { bullets: s.bullets } : {})}
            />
            {s.callout ? <ContentCallout tone="warning">{s.callout}</ContentCallout> : null}
          </Stack>
        ))}
      </Stack>
    </Container>
  );
}
