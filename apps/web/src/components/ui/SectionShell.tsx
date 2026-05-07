import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface SectionShellProps {
  id?: string;
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'elevated' | 'hero';
}

export function SectionShell({
  id,
  children,
  eyebrow,
  title,
  description,
  variant = 'default',
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
    >
      <Container maxW="7xl">
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
