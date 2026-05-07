'use client';
import { Box, Stack, Text } from '@chakra-ui/react';

export interface PaymentStatusCardProps {
  status: 'idle' | 'processing' | 'requires_action' | 'succeeded' | 'failed';
  message?: string;
}

export function PaymentStatusCard({ status, message }: PaymentStatusCardProps) {
  if (status === 'idle') return null;
  const tone =
    status === 'succeeded'
      ? 'accent.neon'
      : status === 'failed'
        ? 'red.300'
        : 'fg.muted';
  const label =
    status === 'processing'
      ? 'Processing payment…'
      : status === 'requires_action'
        ? 'Additional verification required'
        : status === 'succeeded'
          ? 'Payment received'
          : 'Payment did not complete';
  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="md"
      bg="bg.surface"
      p="3"
    >
      <Stack gap="1">
        <Text color={tone} fontSize="sm" fontWeight="600">
          {label}
        </Text>
        {message ? (
          <Text color="fg.muted" fontSize="xs">
            {message}
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
}
