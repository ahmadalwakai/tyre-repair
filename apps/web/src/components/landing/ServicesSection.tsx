import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import {
  FiAlertOctagon,
  FiClock,
  FiPackage,
  FiSettings,
  FiTool,
  FiTruck,
} from 'react-icons/fi';
import { SectionShell } from '@/components/ui/SectionShell';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';
import type { LandingService } from '@/types/landing';

const SERVICES: readonly LandingService[] = [
  {
    id: 'flat-callout',
    title: 'Flat tyre callout',
    copy:
      'Stranded at home, work, or roadside? Start a quote and we’ll price the emergency callout for your location.',
    icon: <FiAlertOctagon />,
  },
  {
    id: 'puncture',
    title: 'Puncture repair',
    copy:
      'Where safe and legal, we repair punctures without forcing a replacement.',
    icon: <FiTool />,
  },
  {
    id: 'replacement',
    title: 'Tyre replacement',
    copy:
      'Choose from budget, mid-range, and premium tyres with stock visibility before payment.',
    icon: <FiSettings />,
  },
  {
    id: 'out-of-hours',
    title: 'Out-of-hours help',
    copy:
      'Night and early morning demand is handled automatically by the live pricing engine.',
    icon: <FiClock />,
  },
  {
    id: 'mobile-fitting',
    title: 'Mobile fitting',
    copy:
      'We come to your location across Scotland and fit the tyre on site.',
    icon: <FiTruck />,
  },
  {
    id: 'special-order',
    title: 'Special order tyres',
    copy:
      'If the tyre is not in stock, the system clearly shows special order before payment.',
    icon: <FiPackage />,
  },
];

export function ServicesSection() {
  return (
    <SectionShell
      id="services"
      eyebrow="Services"
      title="Mobile tyre services when you need them now"
      description="Built around emergency callouts, with clear pricing and stock logic before payment."
    >
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={{ base: '4', md: '6' }}>
        {SERVICES.map((service, i) => (
          <RevealOnScroll key={service.id} delay={i * 0.05}>
            <Stack
              h="full"
              p={{ base: '5', md: '6' }}
              gap="3"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="border.subtle"
              bg="bg.surface"
              transition="border-color 0.2s, transform 0.2s, box-shadow 0.2s"
              _hover={{ borderColor: 'border.gold', transform: 'translateY(-2px)', boxShadow: 'glowSoft' }}
            >
              <Box color="accent.neon" fontSize="2xl" aria-hidden>
                {service.icon}
              </Box>
              <Text fontFamily="heading" fontSize="lg" color="fg.default">
                {service.title}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {service.copy}
              </Text>
            </Stack>
          </RevealOnScroll>
        ))}
      </SimpleGrid>
    </SectionShell>
  );
}

export default ServicesSection;
