import { Box, Flex, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { SectionShell } from '@/components/ui/SectionShell';
import { GoldButton } from '@/components/ui/GoldButton';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';
import type { LandingStep } from '@/types/landing';
import { siteConfig } from '@/lib/site-config';

const STEPS: readonly LandingStep[] = [
  {
    step: 1,
    title: 'Enter your vehicle',
    copy: 'Use your registration or tyre size so the system can identify suitable tyres.',
  },
  {
    step: 2,
    title: 'Choose tyre option',
    copy: 'See budget, mid-range, and premium options with availability before checkout.',
  },
  {
    step: 3,
    title: 'Confirm your location',
    copy:
      'Use address search or a secure location link so the quote can calculate distance.',
  },
  {
    step: 4,
    title: 'Pay securely',
    copy: 'Complete secure card payment and receive your tracking link.',
  },
  {
    step: 5,
    title: 'Track the job',
    copy: 'Use your tracking ID to follow booking status updates.',
  },
];

export function HowItWorksSection() {
  return (
    <SectionShell
      id="how-it-works"
      eyebrow="How it works"
      title="How emergency tyre help works"
      description="The quote flow is built for urgent tyre problems. Here is how it works."
      variant="elevated"
    >
      <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} gap={{ base: '4', md: '5' }}>
        {STEPS.map((s, i) => (
          <RevealOnScroll key={s.step} delay={i * 0.05}>
            <Stack
              h="full"
              gap="3"
              p={{ base: '5', md: '6' }}
              borderRadius="lg"
              borderWidth="1px"
              borderColor="border.subtle"
              bg="bg.canvas"
            >
              <Flex
                w="10"
                h="10"
                align="center"
                justify="center"
                borderRadius="full"
                borderWidth="1px"
                borderColor="border.gold"
                color="accent.neon"
                fontFamily="heading"
                fontWeight="700"
              >
                {s.step}
              </Flex>
              <Text fontFamily="heading" fontSize="md" color="fg.default">
                {s.title}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {s.copy}
              </Text>
            </Stack>
          </RevealOnScroll>
        ))}
      </SimpleGrid>

      <Box mt={{ base: '8', md: '10' }} textAlign="center">
        <GoldButton href={siteConfig.primaryCtaHref} size="lg">
          Start quote
        </GoldButton>
      </Box>
    </SectionShell>
  );
}

export default HowItWorksSection;
