'use client';
import { Box, Container, Flex, Stack, Text } from '@chakra-ui/react';
import { useReducedMotion } from 'framer-motion';
import { FiAlertTriangle } from 'react-icons/fi';
import { MotionBox } from '@/components/motion/MotionBox';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';

export function EmergencyBanner() {
  const reduce = useReducedMotion();
  return (
    <Box as="section" px={{ base: '4', md: '6' }} py={{ base: '6', md: '8' }} bg="bg.canvas">
      <Container maxW="7xl">
        <MotionBox
          borderRadius="lg"
          borderWidth="1px"
          borderColor="border.gold"
          bg="bg.surface"
          px={{ base: '4', md: '6' }}
          py={{ base: '4', md: '5' }}
          {...(reduce
            ? {}
            : {
                animate: {
                  boxShadow: [
                    '0 0 0 rgba(255,215,0,0.0)',
                    '0 0 18px rgba(255,215,0,0.55)',
                    '0 0 0 rgba(255,215,0,0.0)',
                  ],
                },
                transition: { duration: 3.6, repeat: 2, ease: 'easeInOut' },
              })}
        >
          <Flex
            align={{ base: 'flex-start', md: 'center' }}
            justify="space-between"
            gap="4"
            direction={{ base: 'column', md: 'row' }}
          >
            <Stack gap="1" direction={{ base: 'column', sm: 'row' }} align={{ base: 'flex-start', sm: 'center' }}>
              <Box color="accent.neon" fontSize="xl" aria-hidden>
                <FiAlertTriangle />
              </Box>
              <Text color="fg.default" fontSize={{ base: 'sm', md: 'md' }}>
                Every booking is handled as an emergency. No date picker. No waiting for a slot.
                The quote flow prices the callout for now.
              </Text>
            </Stack>
            <GoldButton href={siteConfig.primaryCtaHref} size="md">
              Start emergency quote
            </GoldButton>
          </Flex>
        </MotionBox>
      </Container>
    </Box>
  );
}

export default EmergencyBanner;
