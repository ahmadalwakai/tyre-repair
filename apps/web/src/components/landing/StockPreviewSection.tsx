import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { SectionShell } from '@/components/ui/SectionShell';
import { GoldBadge } from '@/components/ui/GoldBadge';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';

interface Tier {
  id: string;
  name: string;
  pitch: string;
}

const TIERS: readonly Tier[] = [
  {
    id: 'budget',
    name: 'Budget',
    pitch:
      'Price-conscious option for drivers who need the job done now, without compromising on safety.',
  },
  {
    id: 'mid',
    name: 'Mid-range',
    pitch: 'Balanced comfort and value — strong choice for everyday driving conditions.',
  },
  {
    id: 'premium',
    name: 'Premium',
    pitch:
      'Premium performance and trusted brands for drivers who prioritise grip and longevity.',
  },
];

export function StockPreviewSection() {
  return (
    <SectionShell
      eyebrow="Tyres"
      title="Budget, mid-range, and premium tyres"
      description="The quote flow shows tyre options by size, price tier and availability before payment."
      variant="elevated"
      backgroundImage="/images/sections/howitworks-wheel.jpg"
      backgroundAlt="Premium car wheel — budget, mid-range and premium tyre tiers"
    >
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: '4', md: '6' }}>
        {TIERS.map((tier, i) => (
          <RevealOnScroll key={tier.id} delay={i * 0.06}>
            <Stack
              h="full"
              gap="3"
              p={{ base: '6', md: '7' }}
              borderRadius="lg"
              borderWidth="1px"
              borderColor="accent.neon"
              bg="bg.canvas"
              boxShadow="0 0 0 1px rgba(240,24,37,0.35), 0 0 20px rgba(240,24,37,0.25), inset 0 0 12px rgba(240,24,37,0.07)"
              _hover={{
                borderColor: 'accent.neon',
                transform: 'translateY(-2px)',
                boxShadow:
                  '0 0 0 1px rgba(240,24,37,0.6), 0 0 30px rgba(240,24,37,0.55), inset 0 0 16px rgba(240,24,37,0.12)',
              }}
              transition="border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease"
            >
              <GoldBadge>{tier.name}</GoldBadge>
              <Text fontFamily="heading" fontSize="xl" color="fg.default">
                {tier.name} tyres
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {tier.pitch}
              </Text>
            </Stack>
          </RevealOnScroll>
        ))}
      </SimpleGrid>

      <Box mt={{ base: '8', md: '10' }} textAlign="center">
        <Text
          display="inline-block"
          px="4"
          py="2"
          borderRadius="full"
          borderWidth="1px"
          borderColor="border.gold"
          color="accent.neon"
          fontSize="sm"
          fontWeight="600"
        >
          Special order — fitted within 3 working days
        </Text>
      </Box>
    </SectionShell>
  );
}

export default StockPreviewSection;
