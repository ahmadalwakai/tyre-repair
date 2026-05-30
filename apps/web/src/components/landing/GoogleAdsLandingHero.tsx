import {
  Box,
  Container,
  Heading,
  HStack,
  Stack,
  Text,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { FiCheckCircle } from 'react-icons/fi';
import type { ReactNode } from 'react';
import { PostcodeAvailabilityPanel } from './PostcodeAvailabilityPanel';

export interface GoogleAdsLandingHeroProps {
  /** Visible badge above the H1 (e.g. "24/7 emergency mobile tyres"). */
  eyebrow: string;
  /** Page H1 — must be truthful and conversion focused. */
  headline: string;
  /** One-line subheading directly under the H1. */
  subheadline: string;
  /** Short trust bullets. No fake reviews or ratings. */
  trustBullets: readonly string[];
  /** Analytics source label, e.g. "lp_emergency_mobile_tyre_fitting". */
  source: string;
  /** Optional alternative intent for the postcode API. */
  intent?: string;
  /** Optional secondary copy slot rendered below the form. */
  footnote?: ReactNode;
}

/**
 * Reusable Google Ads landing-page hero. Server component — wraps the
 * client `PostcodeAvailabilityPanel`.
 *
 * Above the fold on a 360x640 mobile screen, the rendering order is:
 *   eyebrow -> H1 -> subheading -> postcode form -> trust bullets.
 * The call/WhatsApp CTAs appear inside the result card after submission.
 */
export function GoogleAdsLandingHero({
  eyebrow,
  headline,
  subheadline,
  trustBullets,
  source,
  intent,
  footnote,
}: GoogleAdsLandingHeroProps): React.ReactNode {
  return (
    <Box as="section" bg="bg.canvas" px={{ base: '4', md: '6' }} py={{ base: '8', md: '14' }}>
      <Container maxW="3xl">
        <Stack gap={{ base: '5', md: '6' }}>
          <Text
            as="span"
            fontSize="xs"
            fontWeight="700"
            letterSpacing="0.08em"
            textTransform="uppercase"
            color="yellow.600"
          >
            {eyebrow}
          </Text>
          <Heading
            as="h1"
            fontSize={{ base: '2xl', sm: '3xl', md: '4xl' }}
            lineHeight="1.2"
            color="fg.default"
          >
            {headline}
          </Heading>
          <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} lineHeight="1.6">
            {subheadline}
          </Text>
          <PostcodeAvailabilityPanel source={source} {...(intent ? { intent } : {})} />
          <Wrap gap={{ base: '2', md: '3' }} mt="1">
            {trustBullets.map((b) => (
              <WrapItem key={b}>
                <HStack
                  gap="2"
                  bg="bg.subtle"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  borderRadius="full"
                  px="3"
                  py="1.5"
                  minH="32px"
                >
                  <Box color="green.500" aria-hidden>
                    <FiCheckCircle />
                  </Box>
                  <Text fontSize="sm" color="fg.default">
                    {b}
                  </Text>
                </HStack>
              </WrapItem>
            ))}
          </Wrap>
          {footnote ? (
            <Box color="fg.muted" fontSize="xs">
              {footnote}
            </Box>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
