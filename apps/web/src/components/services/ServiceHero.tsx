import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { GoldBadge } from '@/components/ui/GoldBadge';
import { GoldButton } from '@/components/ui/GoldButton';
import { FiClock } from 'react-icons/fi';
import { siteConfig } from '@/lib/site-config';

export interface ServiceHeroProps {
  title: string;
  intro: string;
  ctaLabel: string;
  ctaHref: string;
}

export function ServiceHero({ title, intro, ctaLabel, ctaHref }: ServiceHeroProps) {
  return (
    <Box as="section" bg="bg.canvas" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }}>
      <Container maxW="5xl">
        <Stack gap="5" align="flex-start">
          <GoldBadge icon={<FiClock />}>Scotland-wide mobile cover · 24/7 vans to you</GoldBadge>
          <Heading
            as="h1"
            fontFamily="heading"
            fontSize={{ base: '3xl', md: '5xl' }}
            lineHeight="1.1"
            color="fg.default"
          >
            {title}
          </Heading>
          <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="3xl" lineHeight="1.7">
            {intro}
          </Text>
          <Stack direction={{ base: 'column', sm: 'row' }} gap="3" pt="2">
            <GoldButton href={ctaHref} size="lg">
              {ctaLabel}
            </GoldButton>
            <GoldButton href={siteConfig.phoneHref} variant="outline" size="lg">
              Call {siteConfig.phoneDisplay}
            </GoldButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
