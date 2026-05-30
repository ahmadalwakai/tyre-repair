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
    title: 'Scotland-wide mobile tyre help',
    copy: 'Mobile fleet of vans and drivers covering the whole of Scotland — we come to you, day or night.',
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
      description="Scotland-wide mobile fleet, real phone support, and an honest repair-first assessment."
      backgroundImage="/images/sections/testimonials-tyre.jpg"
      backgroundAlt="Close-up of a car tyre — honest repair-first assessment"
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
              borderColor="accent.neon"
              bg="bg.surface"
              boxShadow="0 0 0 1px rgba(240,24,37,0.35), 0 0 18px rgba(240,24,37,0.22), inset 0 0 10px rgba(240,24,37,0.06)"
              transition="box-shadow 0.25s ease, transform 0.25s ease"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow:
                  '0 0 0 1px rgba(240,24,37,0.6), 0 0 28px rgba(240,24,37,0.55), inset 0 0 14px rgba(240,24,37,0.12)',
              }}
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
