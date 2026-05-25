import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
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

interface LinkedService extends LandingService {
  href: string;
}

const SERVICES: readonly LinkedService[] = [
  {
    id: 'flat-callout',
    title: 'Flat tyre callout',
    copy:
      'Stranded at home, work, or roadside? Start a quote and we’ll price the emergency callout for your location.',
    icon: <FiAlertOctagon />,
    href: '/services/emergency-tyre-repair',
  },
  {
    id: 'puncture',
    title: 'Puncture repair',
    copy:
      'Where safe and legal, we repair punctures without forcing a replacement.',
    icon: <FiTool />,
    href: '/services/puncture-repair',
  },
  {
    id: 'replacement',
    title: 'Tyre replacement',
    copy:
      'Choose from budget, mid-range, and premium tyres with stock visibility before payment.',
    icon: <FiSettings />,
    href: '/services/mobile-tyre-fitting',
  },
  {
    id: 'out-of-hours',
    title: 'Out-of-hours help',
    copy:
      'Night and early morning demand is handled automatically by the live pricing engine.',
    icon: <FiClock />,
    href: '/services/24-hour-mobile-tyre-fitting',
  },
  {
    id: 'mobile-fitting',
    title: 'Mobile fitting',
    copy:
      'We come to your location across Scotland and fit the tyre on site.',
    icon: <FiTruck />,
    href: '/services/roadside-tyre-fitting',
  },
  {
    id: 'special-order',
    title: 'Special order tyres',
    copy:
      'If the tyre is not in stock, the system clearly shows special order before payment.',
    icon: <FiPackage />,
    href: '/services',
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
            <NextLink
              href={service.href}
              aria-label={`${service.title} — learn more`}
              style={{ display: 'block', height: '100%' }}
            >
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
            </NextLink>
          </RevealOnScroll>
        ))}
      </SimpleGrid>
    </SectionShell>
  );
}

export default ServicesSection;
