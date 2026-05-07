import { Box, Container, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { findServicePage } from '@/lib/seo/service-pages';

export interface LocationServiceCardsProps {
  serviceSlugs: readonly string[];
  city: string;
}

export function LocationServiceCards({ serviceSlugs, city }: LocationServiceCardsProps) {
  const services = serviceSlugs
    .map((slug) => findServicePage(slug))
    .filter((s): s is NonNullable<ReturnType<typeof findServicePage>> => Boolean(s));
  if (services.length === 0) return null;

  return (
    <Box as="section" bg="bg.surface" py={{ base: '10', md: '14' }} px={{ base: '4', md: '6' }}>
      <Container maxW="5xl">
        <Stack gap="6">
          <Heading as="h2" fontFamily="heading" fontSize={{ base: 'xl', md: '2xl' }} color="fg.default">
            Mobile tyre services available in {city}
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
            {services.map((s) => (
              <NextLink key={s.slug} href={`/services/${s.slug}`} prefetch={false}>
                <Box
                  borderWidth="1px"
                  borderColor="border.subtle"
                  borderRadius="lg"
                  p="5"
                  h="100%"
                  _hover={{ borderColor: 'border.gold' }}
                  transition="border-color 120ms"
                >
                  <Stack gap="2">
                    <Text color="accent.neon" fontWeight="700" fontSize="md">
                      {s.title}
                    </Text>
                    <Text color="fg.muted" fontSize="sm" lineHeight="1.6">
                      {s.heroIntro}
                    </Text>
                  </Stack>
                </Box>
              </NextLink>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  );
}
