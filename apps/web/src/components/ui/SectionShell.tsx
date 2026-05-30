import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import Image from 'next/image';
import type { ReactNode } from 'react';

export interface SectionShellProps {
  id?: string;
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'elevated' | 'hero';
  /**
   * Optional decorative background photo (path under /public, e.g. "/images/sections/foo.jpg").
   * Rendered at low opacity behind a dark gradient for legibility.
   * Always pair with `backgroundAlt` for accessibility / SEO.
   */
  backgroundImage?: string;
  backgroundAlt?: string;
}

export function SectionShell({
  id,
  children,
  eyebrow,
  title,
  description,
  variant = 'default',
  backgroundImage,
  backgroundAlt,
}: SectionShellProps) {
  const bg =
    variant === 'elevated'
      ? 'bg.surface'
      : variant === 'hero'
      ? 'transparent'
      : 'bg.canvas';

  return (
    <Box
      as="section"
      {...(id ? { id } : {})}
      bg={bg}
      py={{ base: '14', md: '20', lg: '24' }}
      px={{ base: '4', md: '6' }}
      position="relative"
      overflow="hidden"
    >
      {backgroundImage && (
        <>
          <Box
            aria-hidden={!backgroundAlt}
            position="absolute"
            inset="0"
            zIndex="0"
            opacity={0.22}
            pointerEvents="none"
            css={{ '& img': { objectFit: 'cover', objectPosition: 'center' } }}
          >
            <Image
              src={backgroundImage}
              alt={backgroundAlt ?? ''}
              fill
              sizes="100vw"
              quality={70}
              priority={false}
            />
          </Box>
          {/* Dark + gold legibility overlay */}
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
            pointerEvents="none"
            bgGradient="radial(closest-side, rgba(255,215,0,0.10), transparent 65%)"
          />
        </>
      )}
      <Container maxW="7xl" position="relative" zIndex="1">
        {(eyebrow || title || description) && (
          <Stack gap="3" mb={{ base: '8', md: '12' }} textAlign={{ base: 'left', md: 'center' }}>
            {eyebrow && (
              <Text
                color="accent.neon"
                fontSize="sm"
                fontWeight="600"
                letterSpacing="0.18em"
                textTransform="uppercase"
              >
                {eyebrow}
              </Text>
            )}
            {title && (
              <Heading
                as="h2"
                fontFamily="heading"
                fontSize={{ base: '2xl', md: '4xl', lg: '5xl' }}
                lineHeight="1.1"
                color="fg.default"
                maxW="3xl"
                mx={{ base: '0', md: 'auto' }}
              >
                {title}
              </Heading>
            )}
            {description && (
              <Text
                color="fg.muted"
                fontSize={{ base: 'md', md: 'lg' }}
                maxW="2xl"
                mx={{ base: '0', md: 'auto' }}
              >
                {description}
              </Text>
            )}
          </Stack>
        )}
        {children}
      </Container>
    </Box>
  );
}
