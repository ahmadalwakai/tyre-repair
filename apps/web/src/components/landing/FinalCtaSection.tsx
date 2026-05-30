import { Box, Container, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import Image from 'next/image';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';
import { buildWhatsappHref } from '@/lib/contact/whatsapp-message';

export function FinalCtaSection() {
  return (
    <Box
      as="section"
      position="relative"
      overflow="hidden"
      bg="bg.canvas"
      py={{ base: '14', md: '20' }}
      px={{ base: '4', md: '6' }}
    >
      {/* Decorative dark photo background */}
      <Box
        aria-hidden
        position="absolute"
        inset="0"
        zIndex="0"
        opacity={0.22}
        pointerEvents="none"
        css={{ '& img': { objectFit: 'cover', objectPosition: 'center' } }}
      >
        <Image
          src="/images/sections/hero-tyre-dark.jpg"
          alt=""
          fill
          sizes="100vw"
          quality={70}
        />
      </Box>
      <Box
        aria-hidden
        position="absolute"
        inset="0"
        zIndex="0"
        pointerEvents="none"
        bgGradient="linear(to-b, rgba(10,10,12,0.85), rgba(10,10,12,0.7) 50%, rgba(10,10,12,0.92))"
      />
      <Box
        aria-hidden
        position="absolute"
        inset="0"
        zIndex="0"
        bgGradient="radial(closest-side, rgba(255,215,0,0.18), transparent 65%)"
        pointerEvents="none"
      />
      <Container maxW="4xl" position="relative" zIndex="1">
        <Stack
          gap="6"
          textAlign="center"
          align="center"
          p={{ base: '6', md: '10' }}
          borderRadius="lg"
          borderWidth="1px"
          borderColor="accent.neon"
          bg="bg.canvas"
          boxShadow="0 0 0 1px rgba(240,24,37,0.35), 0 0 28px rgba(240,24,37,0.3), inset 0 0 16px rgba(240,24,37,0.08)"
        >
          <Heading
            as="h2"
            fontFamily="heading"
            fontSize={{ base: '3xl', md: '5xl' }}
            color="fg.default"
            lineHeight="1.1"
          >
            Need tyre help{' '}
            <Box as="span" color="accent.neon" textShadow="0 0 24px rgba(255,215,0,0.45)">
              now?
            </Box>
          </Heading>
          <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="2xl">
            Call {siteConfig.businessName} directly or start an emergency quote. We cover Scotland
            with a Scotland-wide mobile fleet, 24 hours a day.
          </Text>
          <Flex gap="3" wrap="wrap" justify="center">
            <GoldButton
              href={siteConfig.phoneHref}
              size="lg"
              callTrackingSource="HOME_FINAL_CTA_CALL"
            >
              {siteConfig.secondaryCtaLabel}
            </GoldButton>
            <GoldButton href={siteConfig.primaryCtaHref} variant="outline" size="lg">
              {siteConfig.primaryCtaLabel}
            </GoldButton>
            <GoldButton href={buildWhatsappHref()} variant="ghost" size="lg" isExternal>
              WhatsApp
            </GoldButton>
          </Flex>
        </Stack>
      </Container>
    </Box>
  );
}

export default FinalCtaSection;
