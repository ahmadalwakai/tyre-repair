'use client';
import { Spinner, Stack, Text } from '@chakra-ui/react';

export function TrackingLoadingState() {
  return (
    <Stack gap="3" align="center" py="12">
      <Spinner color="accent.neon" />
      <Text color="fg.muted">Loading tracking…</Text>
    </Stack>
  );
}
