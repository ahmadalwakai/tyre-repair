import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface QuoteShellProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function QuoteShell({ title, description, children }: QuoteShellProps) {
  return (
    <Box as="section" py={{ base: '8', md: '12' }} px={{ base: '4', md: '6' }} bg="bg.canvas">
      <Container maxW="4xl">
        <Stack gap="6">
          <Box>
            <Heading
              as="h1"
              fontFamily="heading"
              fontSize={{ base: '2xl', md: '4xl' }}
              color="fg.default"
              lineHeight="1.1"
            >
              {title}
            </Heading>
            {description && (
              <Text color="fg.muted" fontSize={{ base: 'sm', md: 'md' }} mt="2">
                {description}
              </Text>
            )}
          </Box>
          {children}
        </Stack>
      </Container>
    </Box>
  );
}
