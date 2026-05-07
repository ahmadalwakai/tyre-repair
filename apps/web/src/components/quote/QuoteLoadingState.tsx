'use client';
import { Box, Spinner, Stack, Text } from '@chakra-ui/react';

export interface QuoteLoadingStateProps {
  message?: string;
}

export function QuoteLoadingState({ message = 'Working on it…' }: QuoteLoadingStateProps) {
  return (
    <Stack align="center" gap="3" py="10">
      <Box color="accent.neon">
        <Spinner size="lg" />
      </Box>
      <Text color="fg.muted" fontSize="sm">
        {message}
      </Text>
    </Stack>
  );
}
