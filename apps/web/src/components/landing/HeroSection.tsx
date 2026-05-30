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
  Button,
} from '@chakra-ui/react';
import Image from 'next/image';
import { useState } from 'react';
import { FiClock, FiHelpCircle, FiMapPin, FiTool, FiTruck } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { siteConfig } from '@/lib/site-config';
import { GoldBadge } from '@/components/ui/GoldBadge';
import { GoldButton } from '@/components/ui/GoldButton';
import { HeroRepairVisual } from '@/components/landing/HeroRepairVisual';
import { HeroQuickQuoteForm } from '@/components/landing/HeroQuickQuoteForm';
import { WhatsAppQuickHelpSheet } from '@/components/mobile/WhatsAppQuickHelpSheet';
import { defaultEmergencyHref } from '@/lib/contact/whatsapp-options';

const TRUST_BULLETS = [
  { label: '24/7 emergency help', icon: <FiClock /> },
  { label: 'We come to you', icon: <FiTruck /> },
  { label: 'Repair-first assessment', icon: <FiTool /> },
  { label: 'Scotland-wide coverage', icon: <FiMapPin /> },
  { label: "No tyre size? We'll assess on site", icon: <FiHelpCircle /> },
] as const;

export function HeroSection() {
  const [whatsappSheetOpen, setWhatsappSheetOpen] = useState(false);

  return (
    <Box as="section" position="relative" overflow="hidden" bg="bg.canvas">
      {/* Dark photo background — LCP-priority, alt is decorative */}
      <Box
        aria-hidden
        position="absolute"
        inset="0"
        zIndex="0"
        opacity={0.28}
        pointerEvents="none"
        css={{ '& img': { objectFit: 'cover', objectPosition: 'center' } }}
      >
        <Image
          src="/images/sections/hero-tyre-dark.jpg"
          alt=""
          fill
          sizes="100vw"
          quality={75}
          priority
          fetchPriority="high"
        />
      </Box>
      {/* Dark legibility overlay over the photo */}
      <Box
        aria-hidden
        position="absolute"
        inset="0"
        zIndex="0"
        pointerEvents="none"
        bgGradient="linear(to-b, rgba(10,10,12,0.78), rgba(10,10,12,0.6) 45%, rgba(10,10,12,0.9))"
      />
      {/* Ambient gold glow */}
      <Box
        aria-hidden
        position="absolute"
        inset="0"
        zIndex="0"
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

              <style
                dangerouslySetInnerHTML={{
                  __html: `
@keyframes hero-shimmer-sweep {
  0%   { background-position: 200% 0; }
  100% { background-position: -100% 0; }
}
.hero-shimmer {
  background-repeat: no-repeat;
  background-size: 200% 100%;
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
          color: transparent;
  animation: hero-shimmer-sweep 3.5s linear infinite;
  display: inline-block;
}
.hero-shimmer-white {
  background-image: linear-gradient(
    100deg,
    #f4f4f5 0%,
    #f4f4f5 40%,
    #ffffff 50%,
    #f4f4f5 60%,
    #f4f4f5 100%
  );
}
.hero-shimmer-gold {
  background-image: linear-gradient(
    100deg,
    #E30613 0%,
    #E30613 40%,
    #FFF4B8 50%,
    #E30613 60%,
    #E30613 100%
  );
  animation-delay: 0.6s;
}
@media (prefers-reduced-motion: reduce) {
  .hero-shimmer { animation: none; background-position: 0 0; }
}
`,
                }}
              />
              <Heading
                as="h1"
                fontFamily="heading"
                fontSize={{ base: '3xl', sm: '4xl', md: '5xl', lg: '6xl' }}
                lineHeight="1.05"
                color="fg.default"
              >
                <span className="hero-shimmer hero-shimmer-white">Mobile Tyre Fitting</span>
                <br />
                <span className="hero-shimmer hero-shimmer-gold">When You Need Help Now</span>
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
                <Button
                  size="lg"
                  onClick={() => setWhatsappSheetOpen(true)}
                  aria-label={siteConfig.whatsappCtaLabel}
                  bg="#25D366"
                  color="white"
                  borderRadius="6px"
                  fontWeight="700"
                  fontSize={{ base: 'md', md: 'lg' }}
                  minH="52px"
                  px="24px"
                  _hover={{ bg: '#1DA851' }}
                  _active={{ bg: '#178D44' }}
                >
                  <FaWhatsapp aria-hidden style={{ marginRight: '8px' }} size={18} />
                  {siteConfig.whatsappCtaLabel}
                </Button>
                {/* JS-disabled fallback so the WhatsApp link still works. */}
                <noscript>
                  <a
                    href={defaultEmergencyHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#E30613' }}
                  >
                    {siteConfig.whatsappCtaLabel}
                  </a>
                </noscript>
              </Flex>

              <Wrap gap="2" pt="2">
                {TRUST_BULLETS.map((b) => (
                  <GoldBadge key={b.label} icon={b.icon}>
                    {b.label}
                  </GoldBadge>
                ))}
              </Wrap>

              <HeroQuickQuoteForm />
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
      <WhatsAppQuickHelpSheet
        open={whatsappSheetOpen}
        onOpenChange={setWhatsappSheetOpen}
      />
    </Box>
  );
}

export default HeroSection;
