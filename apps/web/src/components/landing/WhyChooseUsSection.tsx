import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import {
  FiActivity,
  FiCreditCard,
  FiHeadphones,
  FiLayers,
  FiNavigation,
  FiUserCheck,
} from 'react-icons/fi';
import { SectionShell } from '@/components/ui/SectionShell';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';

interface Feature {
  id: string;
  title: string;
  copy: string;
  icon: React.ReactNode;
}

const FEATURES: readonly Feature[] = [
  {
    id: 'no-account',
    title: 'No account needed',
    copy: 'Guest checkout keeps the emergency flow quick.',
    icon: <FiUserCheck />,
  },
  {
    id: 'live-stock',
    title: 'Live stock logic',
    copy: 'The system separates available stock from special order before payment.',
    icon: <FiLayers />,
  },
  {
    id: 'pricing',
    title: 'Clear emergency pricing',
    copy:
      'Distance, demand and live availability are handled by the pricing engine, with clear pricing before payment.',
    icon: <FiActivity />,
  },
  {
    id: 'tracking',
    title: 'Tracking included',
    copy: 'Every booking gets a tracking ID beginning with TR-.',
    icon: <FiNavigation />,
  },
  {
    id: 'support',
    title: 'Direct support',
    copy: 'Phone and WhatsApp options stay visible throughout the site.',
    icon: <FiHeadphones />,
  },
  {
    id: 'payments',
    title: 'Secure payments',
    copy:
      'Secure card payments are handled through Stripe, with supported wallet and 3D Secure options where available.',
    icon: <FiCreditCard />,
  },
];

export function WhyChooseUsSection() {
  return (
    <SectionShell
      eyebrow="Why us"
      title="Built for urgent tyre problems"
      description="Platform capabilities tuned for emergencies, not scheduled fitting."
    >
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={{ base: '4', md: '6' }}>
        {FEATURES.map((f, i) => (
          <RevealOnScroll key={f.id} delay={i * 0.04}>
            <Stack
              h="full"
              gap="3"
              p={{ base: '5', md: '6' }}
              borderRadius="lg"
              borderWidth="1px"
              borderColor="border.subtle"
              bg="bg.surface"
              transition="border-color 0.2s, transform 0.2s"
              _hover={{ borderColor: 'border.gold', transform: 'translateY(-2px)' }}
            >
              <Box color="accent.neon" fontSize="2xl" aria-hidden>
                {f.icon}
              </Box>
              <Text fontFamily="heading" fontSize="lg" color="fg.default">
                {f.title}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {f.copy}
              </Text>
            </Stack>
          </RevealOnScroll>
        ))}
      </SimpleGrid>
    </SectionShell>
  );
}

export default WhyChooseUsSection;
