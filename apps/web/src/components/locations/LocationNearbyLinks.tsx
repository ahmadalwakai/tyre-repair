import { Box, Container, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { findLocationPage } from '@/lib/seo/location-pages';

export interface LocationNearbyLinksProps {
  slugs: readonly string[];
  currentSlug: string;
}

export function LocationNearbyLinks({ slugs, currentSlug }: LocationNearbyLinksProps) {
  const items = slugs
    .filter((s) => s !== currentSlug)
    .map((s) => findLocationPage(s))
    .filter((p): p is NonNullable<ReturnType<typeof findLocationPage>> => Boolean(p));
  if (items.length === 0) return null;
  return (
    <Box as="section" px={{ base: '4', md: '6' }} py={{ base: '10', md: '12' }}>
      <Container maxW="5xl">
        <Stack gap="5">
          <Heading as="h2" fontFamily="heading" fontSize={{ base: 'xl', md: '2xl' }} color="fg.default">
            Nearby locations we cover
          </Heading>
          <SimpleGrid columns={{ base: 2, md: 3 }} gap="3">
            {items.map((p) => (
              <NextLink key={p.slug} href={`/locations/${p.slug}`} prefetch={false}>
                <Box
                  borderWidth="1px"
                  borderColor="border.subtle"
                  borderRadius="md"
                  p="3"
                  _hover={{ borderColor: 'border.gold', bg: 'rgba(212,175,55,0.06)' }}
                  transition="border-color 120ms, background-color 120ms"
                >
                  <Text color="accent.neon" fontWeight="700" fontSize="sm">
                    {p.city}
                  </Text>
                  <Text color="fg.muted" fontSize="xs" mt="0.5">
                    {p.region}
                  </Text>
                </Box>
              </NextLink>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  );
}
