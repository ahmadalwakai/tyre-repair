import { Box, Container, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { getActiveZones } from '@/lib/coverage/zones';

/**
 * Service-area summary card grid. Lists genuine active coverage zones only.
 * Never invents fake branches or local addresses.
 */
export async function CoverageZoneSummary(): Promise<React.ReactNode> {
  const zones = await getActiveZones();
  return (
    <Box as="section" px={{ base: '4', md: '6' }} py={{ base: '10', md: '14' }} bg="bg.surface">
      <Container maxW="5xl">
        <Stack gap="6">
          <Stack gap="2">
            <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }} color="fg.default">
              Where we dispatch in Scotland
            </Heading>
            <Text color="fg.muted" fontSize="sm" maxW="2xl">
              Mobile service-area coverage from our Glasgow base. We do not run
              fake branches. Response windows below are typical dispatch ranges,
              not guaranteed arrival times.
            </Text>
          </Stack>
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap="3">
            {zones.map((z) => (
              <Box
                key={z.id}
                borderWidth="1px"
                borderColor="border.subtle"
                borderRadius="md"
                p="4"
                bg="bg.canvas"
              >
                <Text fontWeight="700" color="fg.default">
                  {z.name}
                </Text>
                <Text color="fg.muted" fontSize="sm" mt="1">
                  Postcodes: {z.postcodePrefixes.join(', ')}
                </Text>
                <Text color="fg.muted" fontSize="xs" mt="2">
                  Typical response {z.estimatedResponseMinutesMin}–
                  {z.estimatedResponseMinutesMax} minutes
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  );
}
