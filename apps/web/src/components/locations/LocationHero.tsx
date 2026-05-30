import { Box, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import type { BreadcrumbItem } from '@/types/seo';

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null;
  return (
    <Box bg="bg.canvas" px={{ base: '4', md: '6' }} pt={{ base: '4', md: '6' }}>
      <Container maxW="5xl">
        <HStack gap="2" wrap="wrap" as="nav" aria-label="Breadcrumb">
          {items.map((it, i) => {
            const isLast = i === items.length - 1;
            return (
              <HStack key={it.href} gap="2">
                {isLast ? (
                  <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.12em">
                    {it.name}
                  </Text>
                ) : (
                  <NextLink href={it.href}>
                    <Text fontSize="xs" color="accent.neon" textTransform="uppercase" letterSpacing="0.12em" _hover={{ textDecoration: 'underline' }}>
                      {it.name}
                    </Text>
                  </NextLink>
                )}
                {!isLast ? (
                  <Text fontSize="xs" color="fg.muted">
                    /
                  </Text>
                ) : null}
              </HStack>
            );
          })}
        </HStack>
      </Container>
    </Box>
  );
}

export interface LocationHeroProps {
  city: string;
  region: string;
  title: string;
  intro: string;
  primaryKeywords: readonly string[];
}

export function LocationHero({ city, region, title, intro, primaryKeywords }: LocationHeroProps) {
  return (
    <Box as="section" bg="bg.canvas" py={{ base: '12', md: '16' }} px={{ base: '4', md: '6' }}>
      <Container maxW="5xl">
        <Stack gap="4" align="flex-start">
          <Text color="accent.neon" fontSize="xs" textTransform="uppercase" letterSpacing="0.18em">
            {region} · Scotland-wide mobile cover
          </Text>
          <Heading as="h1" fontFamily="heading" fontSize={{ base: '3xl', md: '5xl' }} lineHeight="1.1" color="fg.default">
            {title}
          </Heading>
          <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="3xl" lineHeight="1.7">
            {intro}
          </Text>
          {primaryKeywords[0] ? (
            <Text color="fg.subtle" fontSize="xs" textTransform="uppercase" letterSpacing="0.14em">
              {city} · {primaryKeywords[0]}
            </Text>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
