'use client';
import {
  Box,
  Container,
  Flex,
  Grid,
  GridItem,
  Heading,
  Stack,
  Text,
  Wrap,
} from '@chakra-ui/react';
import { FiClock, FiMapPin, FiTool, FiTruck } from 'react-icons/fi';
import { siteConfig } from '@/lib/site-config';
import { GoldBadge } from '@/components/ui/GoldBadge';
import { GoldButton } from '@/components/ui/GoldButton';
import { HeroRepairVisual } from '@/components/landing/HeroRepairVisual';

const TRUST_BULLETS = [
  { label: '24/7 emergency help', icon: <FiClock /> },
  { label: 'We come to you', icon: <FiTruck /> },
  { label: 'Repair-first assessment', icon: <FiTool /> },
  { label: 'Scotland-wide coverage', icon: <FiMapPin /> },
] as const;

export function HeroSection() {
  return (
    <Box as="section" position="relative" overflow="hidden" bg="bg.canvas">
      {/* Ambient gold glow */}
      <Box
        aria-hidden
        position="absolute"
        inset="0"
        bgGradient="radial(closest-side, rgba(255,215,0,0.10), rgba(212,175,55,0.03) 45%, transparent 70%)"
        pointerEvents="none"
      />

      <Container
        maxW="7xl"
        position="relative"
        zIndex="1"
        px={{ base: '4', md: '6' }}
        pt={{ base: '8', md: '16', lg: '20' }}
        pb={{ base: '12', md: '20' }}
      >
        <Grid
          templateColumns={{ base: '1fr', lg: '1.1fr 0.9fr' }}
          gap={{ base: '8', lg: '12' }}
          alignItems="center"
        >
          {/* LEFT — copy & CTAs */}
          <GridItem>
            <Stack gap={{ base: '4', md: '6' }} textAlign="left" align="flex-start">
              <GoldBadge icon={<FiClock />}>24/7 Emergency Mobile Tyre Help</GoldBadge>

              <Heading
                as="h1"
                fontFamily="heading"
                fontSize={{ base: '3xl', sm: '4xl', md: '5xl', lg: '6xl' }}
                lineHeight="1.05"
                color="fg.default"
              >
                Mobile Tyre Fitting
                <br />
                <Box as="span" color="accent.neon">
                  When You Need Help Now
                </Box>
              </Heading>

              <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="2xl">
                Emergency tyre repair and replacement at home, work or roadside. We come to you
                across Scotland with repair-first assessment and no date or time slot required.
              </Text>

              <Flex gap="3" wrap="wrap" pt="1">
                <GoldButton
                  href={siteConfig.phoneHref}
                  size="lg"
                  callTrackingSource="HOME_HERO_CALL"
                >
                  Call {siteConfig.phoneDisplay}
                </GoldButton>
                <GoldButton href={siteConfig.primaryCtaHref} variant="outline" size="lg">
                  {siteConfig.primaryCtaLabel}
                </GoldButton>
                <GoldButton
                  href={siteConfig.whatsappHref}
                  variant="ghost"
                  size="lg"
                  isExternal
                >
                  {siteConfig.whatsappCtaLabel}
                </GoldButton>
              </Flex>

              <Wrap gap="2" pt="2">
                {TRUST_BULLETS.map((b) => (
                  <GoldBadge key={b.label} icon={b.icon}>
                    {b.label}
                  </GoldBadge>
                ))}
              </Wrap>
            </Stack>
          </GridItem>

          {/* RIGHT — animated repair visual card */}
          <GridItem>
            <Box mt={{ base: '2', lg: '0' }}>
              <HeroRepairVisual />
            </Box>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}

export default HeroSection;
