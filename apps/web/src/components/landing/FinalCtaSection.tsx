import { Box, Container, Flex, Heading, Stack, Text } from '@chakra-ui/react';
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
      <Box
        aria-hidden
        position="absolute"
        inset="0"
        bgGradient="radial(closest-side, rgba(255,215,0,0.18), transparent 65%)"
        pointerEvents="none"
      />
      <Container maxW="4xl" position="relative">
        <Stack gap="6" textAlign="center" align="center">
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
            from our Glasgow base, 24 hours a day.
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
