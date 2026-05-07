'use client';
import { Box, Stack, Text } from '@chakra-ui/react';
import type { TrackingTimelineEvent } from '@/lib/bookings/types';

export interface TrackingStatusTimelineProps {
  events: ReadonlyArray<TrackingTimelineEvent & { label: string }>;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function TrackingStatusTimeline({ events }: TrackingStatusTimelineProps) {
  if (events.length === 0) {
    return (
      <Box
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="lg"
        bg="bg.surface"
        p={{ base: '4', md: '6' }}
      >
        <Text color="fg.muted">No status updates yet.</Text>
      </Box>
    );
  }
  return (
    <Stack
      gap="0"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      bg="bg.surface"
      p={{ base: '4', md: '6' }}
    >
      <Text color="fg.default" fontFamily="heading" fontSize="lg" mb="3">
        Status updates
      </Text>
      <Stack gap="3">
        {events.map((e, idx) => (
          <Box
            key={`${e.toStatus}-${e.createdAt}-${idx}`}
            borderLeftWidth="2px"
            borderColor="accent.neon"
            pl="3"
          >
            <Text color="accent.neon" fontFamily="heading" fontSize="sm">
              {e.label}
            </Text>
            <Text color="fg.muted" fontSize="xs">
              {formatTimestamp(e.createdAt)}
            </Text>
            {e.message ? (
              <Text color="fg.default" fontSize="sm" mt="1">
                {e.message}
              </Text>
            ) : null}
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
