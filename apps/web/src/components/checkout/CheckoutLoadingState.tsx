'use client';
import { Spinner, Stack, Text } from '@chakra-ui/react';

export function CheckoutLoadingState({ message }: { message?: string }) {
  return (
    <Stack gap="3" align="center" py="12">
      <Spinner color="accent.neon" />
      <Text color="fg.muted">{message ?? 'Preparing secure checkout…'}</Text>
    </Stack>
  );
}
