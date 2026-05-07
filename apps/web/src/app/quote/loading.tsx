import { Box, Container, Spinner, Stack, Text } from '@chakra-ui/react';

export default function QuoteLoading() {
  return (
    <Box as="section" py="20" bg="bg.canvas">
      <Container maxW="2xl">
        <Stack align="center" gap="3">
          <Box color="accent.neon">
            <Spinner size="lg" />
          </Box>
          <Text color="fg.muted">Loading the emergency quote flow…</Text>
        </Stack>
      </Container>
    </Box>
  );
}
