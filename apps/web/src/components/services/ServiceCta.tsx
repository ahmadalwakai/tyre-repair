import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';

export interface ServiceCtaProps {
  ctaLabel: string;
  ctaHref: string;
  variant?: 'service' | 'location';
}

export function ServiceCta({ ctaLabel, ctaHref, variant = 'service' }: ServiceCtaProps) {
  const heading =
    variant === 'location'
      ? 'Need mobile tyre help right now?'
      : 'Get an instant mobile tyre quote';
  return (
    <Box as="section" bg="bg.surface" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }} borderTopWidth="1px" borderColor="border.gold">
      <Container maxW="3xl">
        <Stack gap="5" align={{ base: 'flex-start', md: 'center' }} textAlign={{ base: 'left', md: 'center' }}>
          <Heading as="h2" fontFamily="heading" fontSize={{ base: '2xl', md: '3xl' }} color="fg.default">
            {heading}
          </Heading>
          <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }}>
            Quote in seconds. No date or time picker — pricing reflects the conditions right now.
          </Text>
          <Stack direction={{ base: 'column', sm: 'row' }} gap="3">
            <GoldButton href={ctaHref} size="lg">
              {ctaLabel}
            </GoldButton>
            <GoldButton href={siteConfig.phoneHref} variant="outline" size="lg">
              Call {siteConfig.phoneDisplay}
            </GoldButton>
            <GoldButton href={siteConfig.whatsappHref} variant="ghost" size="lg" isExternal>
              WhatsApp
            </GoldButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
