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

function formatMultiplier(mul: number): string {
  if (!Number.isFinite(mul)) return '×1.00';
  return `×${mul.toFixed(2)}`;
}

export function QuoteSummaryCard({ quote }: QuoteSummaryCardProps) {
  const { tyre, pricing, vehicle, location, availability, jobType, backupTyre } = quote;
  const { breakdown } = pricing;
  const expiresAt = new Date(quote.expiresAt);
  const hasOverrides = breakdown.overrides.activeOverrides.length > 0;
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
          <PriceRow
            label={isAssessment ? 'Assessment fee' : 'Tyre base price'}
            value={formatGbp(pricing.basePriceGbp)}
          />
          <FactorRow
            label="Time of day"
            detail={breakdown.time.reason}
            multiplier={breakdown.time.multiplier}
          />
          <FactorRow
            label="Weather conditions"
            detail={breakdown.weather.reason}
            multiplier={breakdown.weather.multiplier}
          />
          <FactorRow
            label="Date adjustment"
            detail={breakdown.date.reason}
            multiplier={breakdown.date.multiplier}
          />
          <FactorRow
            label="Current demand"
            detail={breakdown.demand.reason}
            multiplier={breakdown.demand.multiplier}
          />
          {hasOverrides && (
            <FactorRow
              label="Admin price adjustment"
              detail={breakdown.overrides.activeOverrides.map((o) => o.label).join(', ')}
              multiplier={breakdown.overrides.multiplier}
            />
          )}
          <PriceRow
            label={isAssessment ? 'Assessment fee (after factors)' : 'Tyre subtotal (after factors)'}
            value={formatGbp(pricing.multipliedTyrePriceGbp)}
          />
          <PriceRow
            label={
              breakdown.distance.distanceMiles === null
                ? 'Distance from Glasgow HQ'
                : `Distance from Glasgow HQ (${breakdown.distance.distanceMiles.toFixed(1)} mi)`
            }
            value={formatGbp(pricing.distanceFeeGbp)}
            subtext={breakdown.distance.reason}
          />
          <Flex justify="space-between" pt="2" borderTopWidth="1px" borderColor="border.subtle">
            <Text fontFamily="heading" color="fg.default" fontSize="lg">
              Total to pay
            </Text>
            <Text fontFamily="heading" color="accent.neon" fontSize="xl">
              {formatGbp(pricing.totalPriceGbp)}
            </Text>
          </Flex>
          {isAssessment ? (
            <Text color="fg.muted" fontSize="xs" pt="2">
              If a replacement tyre is needed, we quote it on site and you decide before any extra
              is charged.
            </Text>
          ) : null}
        </Stack>
      </Box>

      <Stack gap="1">
        {breakdown.notes.map((n) => (
          <Text key={n} color="fg.muted" fontSize="xs">
            • {n}
          </Text>
        ))}
        <Text color="fg.muted" fontSize="xs">
          Quote expires at {expiresAt.toLocaleString('en-GB')}.
        </Text>
      </Stack>

      <HStack gap="3" wrap="wrap" />
    </Stack>
  );
}

function PriceRow({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <Stack gap="0">
      <Flex justify="space-between">
        <Text color="fg.muted" fontSize="sm">
          {label}
        </Text>
        <Text color="fg.default" fontSize="sm">
          {value}
        </Text>
      </Flex>
      {subtext ? (
        <Text color="fg.muted" fontSize="xs">
          {subtext}
        </Text>
      ) : null}
    </Stack>
  );
}

function FactorRow({
  label,
  detail,
  multiplier,
}: {
  label: string;
  detail: string;
  multiplier: number;
}) {
  return (
    <Stack gap="0">
      <Flex justify="space-between">
        <Text color="fg.muted" fontSize="sm">
          {label}
        </Text>
        <Text color="fg.default" fontSize="sm">
          {formatMultiplier(multiplier)}
        </Text>
      </Flex>
      <Text color="fg.muted" fontSize="xs">
        {detail}
      </Text>
    </Stack>
  );
}
