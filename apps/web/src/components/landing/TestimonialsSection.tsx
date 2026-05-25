import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { FiCheckCircle, FiMapPin, FiPhone, FiShield } from 'react-icons/fi';
import { SectionShell } from '@/components/ui/SectionShell';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';

interface TrustCard {
  id: string;
  title: string;
  copy: string;
  icon: React.ReactNode;
}

const TRUST_CARDS: readonly TrustCard[] = [
  {
    id: 'glasgow-base',
    title: 'Glasgow-based mobile tyre help',
    copy: 'Real Glasgow base at Unit 1, 10 Gateside Street. Mobile cover across Scotland.',
    icon: <FiMapPin />,
  },
  {
    id: 'real-phone',
    title: 'Real phone support',
    copy: 'Speak to a person on 0141 266 0690. WhatsApp also available 24/7.',
    icon: <FiPhone />,
  },
  {
    id: 'repair-first',
    title: 'Repair-first assessment',
    copy: 'Where safe and legal, we repair instead of pushing a replacement.',
    icon: <FiCheckCircle />,
  },
  {
    id: 'secure-payment',
    title: 'Secure payment and tracking',
    copy: 'Stripe-secured payment and a tracking ID for every booking.',
    icon: <FiShield />,
  },
];

export function TestimonialsSection() {
  return (
    <SectionShell
      eyebrow="Why us"
      title="Why drivers call TyreRepair UK"
      description="Real Glasgow base, real phone support, and an honest repair-first assessment."
    >
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={{ base: '4', md: '6' }}>
        {TRUST_CARDS.map((card, i) => (
          <RevealOnScroll key={card.id} delay={i * 0.05}>
            <Stack
              h="full"
              gap="3"
              p={{ base: '5', md: '6' }}
              borderRadius="lg"
              borderWidth="1px"
              borderColor="border.subtle"
              bg="bg.surface"
            >
              <Box color="accent.neon" fontSize="2xl" aria-hidden>
                {card.icon}
              </Box>
              <Text fontFamily="heading" fontSize="md" color="fg.default">
                {card.title}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {card.copy}
              </Text>
            </Stack>
          </RevealOnScroll>
        ))}
      </SimpleGrid>
    </SectionShell>
  );
}

export default TestimonialsSection;
