'use client';
import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import { availabilityLabel, SPECIAL_ORDER_COPY } from '@/lib/quote/tyres';
import type { TrackingBookingResult } from '@/lib/bookings/types';

export interface TrackingSummaryCardProps {
  data: TrackingBookingResult & {
    statusLabel: string;
    statusDescription: string;
  };
}

function formatGbp(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? `£${n.toFixed(2)}` : `£${value}`;
}

export function TrackingSummaryCard({ data }: TrackingSummaryCardProps) {
  return (
    <Stack
      gap="4"
      borderWidth="1px"
      borderColor="border.gold"
      borderRadius="lg"
      bg="bg.surface"
      p={{ base: '4', md: '6' }}
    >
      <Stack gap="1">
        <Text color="fg.muted" fontSize="sm">
          Tracking reference
        </Text>
        <Text fontFamily="heading" color="fg.default" fontSize="2xl">
          {data.trackingId}
        </Text>
      </Stack>

      <Box borderTopWidth="1px" borderColor="border.subtle" pt="4">
        <Stack gap="1">
          <Text color="accent.neon" fontFamily="heading" fontSize="lg">
            {data.statusLabel}
          </Text>
          <Text color="fg.muted" fontSize="sm">
            {data.statusDescription}
          </Text>
        </Stack>
      </Box>

      <Box borderTopWidth="1px" borderColor="border.subtle" pt="4">
        <Stack gap="1">
          <Text color="fg.muted" fontSize="sm">
            Job type
          </Text>
          <Text color="fg.default">
            {data.jobType === 'ASSESSMENT'
              ? 'Emergency tyre assessment (repair where possible)'
              : 'Tyre replacement'}
          </Text>
          {data.tyreProblemType ? (
            <Text color="fg.muted" fontSize="sm">
              Tyre problem: {tyreProblemLabel(data.tyreProblemType)}
            </Text>
          ) : null}
        </Stack>
      </Box>

      {data.tyre ? (
        <Box borderTopWidth="1px" borderColor="border.subtle" pt="4">
          <Stack gap="1">
            <Text color="fg.muted" fontSize="sm">
              Tyre
            </Text>
            <Text color="fg.default">
              {data.tyre.brand} {data.tyre.model}
            </Text>
            <Text color="fg.muted" fontSize="sm">
              {data.tyre.sizeLabel}
              {data.quantity && data.quantity > 1 ? ` · Quantity ${data.quantity}` : ''}
            </Text>
            {data.isSpecialOrder ? (
              <Text color="accent.neon" fontSize="sm">
                {SPECIAL_ORDER_COPY}
              </Text>
            ) : (
              <Text color="fg.muted" fontSize="sm">
                {availabilityLabel(data.availability)}
              </Text>
            )}
          </Stack>
        </Box>
      ) : null}

      {data.source === 'tyre_shop' ? (
        <Box borderTopWidth="1px" borderColor="border.subtle" pt="4">
          <Stack gap="1">
            <Text color="fg.muted" fontSize="sm">
              Fitting
            </Text>
            <Text color="fg.default">
              {data.fittingMethod === 'HOME'
                ? 'Mobile fitting at your address'
                : data.fittingMethod === 'GARAGE'
                  ? 'Fitting at our Glasgow garage'
                  : 'Fitting confirmed by our team'}
            </Text>
            {data.slotLabel ? (
              <Text color="fg.muted" fontSize="sm">
                Booked slot: {data.slotLabel}
              </Text>
            ) : data.scheduledAt ? (
              <Text color="fg.muted" fontSize="sm">
                Booked slot: {new Date(data.scheduledAt).toLocaleString('en-GB')}
              </Text>
            ) : null}
            {data.isBackorder ? (
              <Text color="accent.neon" fontSize="sm">
                {data.backorderEtaDays
                  ? `Special order — fitted within ${data.backorderEtaDays} working days`
                  : SPECIAL_ORDER_COPY}
              </Text>
            ) : null}
          </Stack>
        </Box>
      ) : null}

      {data.backupTyre ? (
        <Box borderTopWidth="1px" borderColor="border.subtle" pt="4">
          <Stack gap="1">
            <Text color="fg.muted" fontSize="sm">
              Backup tyre noted
            </Text>
            <Text color="fg.default">
              {data.backupTyre.brand} {data.backupTyre.model} ({data.backupTyre.sizeLabel})
            </Text>
            <Text color="fg.muted" fontSize="xs">
              Only fitted (and charged) if a replacement is required on site.
            </Text>
          </Stack>
        </Box>
      ) : null}

      {data.location ? (
        <Box borderTopWidth="1px" borderColor="border.subtle" pt="4">
          <Stack gap="1">
            <Text color="fg.muted" fontSize="sm">
              Callout location
            </Text>
            <Text color="fg.default">{data.location.addressLine1}</Text>
            <Text color="fg.muted" fontSize="sm">
              {data.location.city} · {data.location.postcode}
            </Text>
          </Stack>
        </Box>
      ) : null}

      <Box borderTopWidth="1px" borderColor="border.subtle" pt="4">
        <Stack gap="1">
          <Text color="fg.muted" fontSize="sm">
            Locking wheel nuts
          </Text>
          <Text color="fg.default">
            {data.lockingWheelNutStatus === 'HAVE_KEY'
              ? 'Key in car'
              : data.lockingWheelNutStatus === 'NO_KEY'
                ? 'Key not available — please ensure the fitter can access your wheels, or call us to arrange'
                : 'Standard nuts only'}
          </Text>
        </Stack>
      </Box>

      <Box borderTopWidth="1px" borderColor="border.subtle" pt="4">
        <Flex justify="space-between" align="baseline">
          <Stack gap="0">
            <Text color="fg.muted" fontSize="sm">
              {data.jobType === 'ASSESSMENT' ? 'Assessment fee paid' : 'Total paid'}
            </Text>
            <Text color="fg.muted" fontSize="xs">
              Payment status: {data.paymentStatus}
            </Text>
          </Stack>
          <Text fontFamily="heading" color="accent.neon" fontSize="xl">
            {formatGbp(data.totalPriceGbp)}
          </Text>
        </Flex>
      </Box>
    </Stack>
  );
}

function tyreProblemLabel(p: NonNullable<TrackingBookingResult['tyreProblemType']>): string {
  switch (p) {
    case 'PUNCTURE_OR_FLAT':
      return 'Puncture or flat';
    case 'DAMAGED_OR_BLOWN_OUT':
      return 'Damaged sidewall or blowout';
    case 'SLOW_PRESSURE_LOSS':
      return 'Slow pressure loss';
    case 'NEEDS_REPLACEMENT':
      return 'Replacement requested';
    case 'NOT_SURE':
    default:
      return 'Not sure';
  }
}
