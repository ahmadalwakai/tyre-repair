'use client';
import { Box, Flex, HStack, Stack, Text } from '@chakra-ui/react';
import { availabilityLabel } from '@/lib/quote/tyres';
import { formatRegistrationDisplay } from '@/lib/quote/vehicle';
import { SpecialOrderNotice } from './SpecialOrderNotice';
import type { QuoteDisplayData } from '@/types/quote';

export interface QuoteSummaryCardProps {
  quote: QuoteDisplayData;
}

function formatGbp(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? `£${n.toFixed(2)}` : `£${value}`;
}

export function QuoteSummaryCard({ quote }: QuoteSummaryCardProps) {
  const { tyre, pricing, vehicle, location, availability, jobType, backupTyre } = quote;
  const { breakdown } = pricing;
  const expiresAt = new Date(quote.expiresAt);
  const isAssessment = jobType === 'ASSESSMENT';

  return (
    <Stack
      gap="5"
      p={{ base: '4', md: '6' }}
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.gold"
      bg="bg.surface"
    >
      <Stack gap="1">
        <Text color="fg.muted" fontSize="sm">
          Quote reference
        </Text>
        <Text fontFamily="heading" color="accent.neon" fontSize="lg">
          {quote.quoteId.slice(0, 8).toUpperCase()}
        </Text>
      </Stack>

      {isAssessment ? (
        <Stack gap="2">
          <Text fontFamily="heading" color="fg.default" fontSize="xl">
            Emergency tyre assessment
          </Text>
          <Text color="fg.muted" fontSize="sm">
            We come to you, inspect the tyre and repair it on site if it is safe to do so.
            Replacement tyres are quoted separately if needed.
          </Text>
          {backupTyre ? (
            <Text color="accent.neon" fontSize="sm">
              Backup tyre noted: {backupTyre.brand} {backupTyre.model} ({backupTyre.sizeLabel}) —
              not charged unless fitted on site.
            </Text>
          ) : null}
        </Stack>
      ) : tyre ? (
        <Stack gap="2">
          <Text fontFamily="heading" color="fg.default" fontSize="xl">
            {tyre.brand} {tyre.model}
          </Text>
          <Text color="fg.muted" fontSize="sm">
            {tyre.sizeLabel} · {tyre.speedRating} · LI {tyre.loadIndex}
          </Text>
          {availability === 'special_order' ? (
            <SpecialOrderNotice />
          ) : (
            <Text color={availability === 'low_stock' ? 'accent.neon' : 'fg.muted'} fontSize="sm">
              {availabilityLabel(availability)}
            </Text>
          )}
        </Stack>
      ) : null}

      {(vehicle.registration || vehicle.make) && (
        <Stack gap="1">
          <Text color="fg.muted" fontSize="sm">
            Vehicle
          </Text>
          <Text color="fg.default">
            {vehicle.registration ? formatRegistrationDisplay(vehicle.registration) : ''}{' '}
            {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
            {vehicle.year ? ` · ${vehicle.year}` : ''}
          </Text>
        </Stack>
      )}

      {location && (location.addressLine1 || location.postcode) && (
        <Stack gap="1">
          <Text color="fg.muted" fontSize="sm">
            Callout location
          </Text>
          <Text color="fg.default">
            {[location.addressLine1, location.city, location.postcode]
              .filter(Boolean)
              .join(', ')}
          </Text>
        </Stack>
      )}

      <Box borderTopWidth="1px" borderColor="border.subtle" pt="4">
        <Stack gap="2">
          <Flex justify="space-between" pt="2">
            <Text fontFamily="heading" color="fg.default" fontSize="lg">
              Total to pay
            </Text>
            <Text fontFamily="heading" color="accent.neon" fontSize="xl">
              {formatGbp(pricing.totalPriceGbp)}
            </Text>
          </Flex>
          <HStack
            gap="2"
            align="flex-start"
            mt="1"
            p="2"
            borderRadius="md"
            bg="rgba(255,215,0,0.08)"
            borderWidth="1px"
            borderColor="accent.neon"
          >
            <Text color="accent.neon" fontSize="md" lineHeight="1">
              ★
            </Text>
            <Text
              color="accent.neon"
              fontSize="sm"
              fontFamily="heading"
              fontWeight="700"
              letterSpacing="0.02em"
            >
              Supplied and fitted on your location.
            </Text>
          </HStack>
          {isAssessment ? (
            <Text color="fg.muted" fontSize="xs" pt="2">
              If a replacement tyre is needed, we quote it on site and you decide before any extra
              is charged.
            </Text>
          ) : null}
        </Stack>
      </Box>

      <Stack gap="1">
        <Text color="fg.muted" fontSize="xs">
          Quote expires at {expiresAt.toLocaleString('en-GB')}.
        </Text>
      </Stack>

      <HStack gap="3" wrap="wrap" />
    </Stack>
  );
}
