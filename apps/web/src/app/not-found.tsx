import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';

export default function NotFound() {
  return (
    <Box
      as="main"
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="bg.canvas"
      px={{ base: '4', md: '6' }}
      py="20"
    >
      <Container maxW="2xl">
        <Stack gap="6" align="center" textAlign="center">
          <Text
            color="accent.neon"
            fontSize="sm"
            letterSpacing="0.18em"
            textTransform="uppercase"
            fontWeight="700"
          >
            404
          </Text>
          <Heading
            as="h1"
            fontFamily="heading"
            fontSize={{ base: '3xl', md: '5xl' }}
            color="fg.default"
          >
            This page could not be found.
          </Heading>
          <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }}>
            The link may be broken or the page has moved.
          </Text>
          <GoldButton href="/" size="lg">
            Back to emergency tyre help
          </GoldButton>
        </Stack>
      </Container>
    </Box>
  );
}
