import { Box, Heading, SimpleGrid, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import type { LocationPage } from '@/types/seo';

export interface LocationPageLinksProps {
  title?: string;
  pages: readonly LocationPage[];
}

/**
 * Lightweight link grid used by the Coverage page and the Locations index.
 * Renders each location with city, region, and target query phrase to give
 * search bots a clean text-around-link signal.
 */
export function LocationPageLinks({ title, pages }: LocationPageLinksProps) {
  return (
    <Box as="section" aria-label={title ?? 'Location coverage'}>
      {title ? (
        <Heading as="h2" fontFamily="heading" fontSize={{ base: 'xl', md: '2xl' }} color="fg.default" mb="5">
          {title}
        </Heading>
      ) : null}
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={{ base: '3', md: '4' }}>
        {pages.map((p) => (
          <NextLink key={p.slug} href={`/locations/${p.slug}`} prefetch={false}>
            <Box
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="lg"
              p="4"
              h="100%"
              _hover={{ borderColor: 'border.gold', bg: 'rgba(212,175,55,0.06)' }}
              transition="border-color 120ms, background-color 120ms"
            >
              <Text color="accent.neon" fontWeight="700" fontSize="md">
                {p.city}
              </Text>
              <Text color="fg.muted" fontSize="xs" mt="0.5" textTransform="uppercase" letterSpacing="0.1em">
                {p.region}
              </Text>
              {p.primaryKeywords[0] ? (
                <Text color="fg.muted" fontSize="sm" mt="2" lineHeight="1.5">
                  {p.primaryKeywords[0]}
                </Text>
              ) : null}
            </Box>
          </NextLink>
        ))}
      </SimpleGrid>
    </Box>
  );
}
