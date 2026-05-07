import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { FiMessageCircle } from 'react-icons/fi';
import { SectionShell } from '@/components/ui/SectionShell';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';
import type { LandingTestimonial } from '@/types/landing';

const TESTIMONIALS: readonly LandingTestimonial[] = [
  {
    id: 't1',
    quote: 'Quick, clear, and easy to arrange when the tyre went flat.',
    attribution: 'Glasgow driver',
  },
  {
    id: 't2',
    quote: 'The mobile fitting option saved a lot of hassle.',
    attribution: 'Edinburgh customer',
  },
  {
    id: 't3',
    quote: 'Good communication and straightforward pricing.',
    attribution: 'Roadside callout',
  },
];

export function TestimonialsSection() {
  return (
    <SectionShell
      eyebrow="Drivers"
      title="What drivers say about emergency callouts"
      description="Anonymised feedback from real callout situations."
    >
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: '4', md: '6' }}>
        {TESTIMONIALS.map((t, i) => (
          <RevealOnScroll key={t.id} delay={i * 0.05}>
            <Stack
              h="full"
              gap="4"
              p={{ base: '6', md: '7' }}
              borderRadius="lg"
              borderWidth="1px"
              borderColor="border.subtle"
              bg="bg.surface"
            >
              <Box color="accent.neon" fontSize="xl" aria-hidden>
                <FiMessageCircle />
              </Box>
              <Text color="fg.default" fontSize="md" lineHeight="1.6">
                &ldquo;{t.quote}&rdquo;
              </Text>
              <Text color="fg.muted" fontSize="sm" fontWeight="600">
                — {t.attribution}
              </Text>
            </Stack>
          </RevealOnScroll>
        ))}
      </SimpleGrid>
    </SectionShell>
  );
}

export default TestimonialsSection;
