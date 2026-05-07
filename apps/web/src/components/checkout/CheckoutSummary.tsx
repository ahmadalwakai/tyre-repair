'use client';
import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import { availabilityLabel, SPECIAL_ORDER_COPY } from '@/lib/quote/tyres';
import type { CheckoutQuoteSummary } from '@/lib/checkout/types';

export interface CheckoutSummaryProps {
  quote: CheckoutQuoteSummary;
  paymentMode?: 'FULL' | 'DEPOSIT';
  depositAmountGbp?: string | null;
  balanceDueGbp?: string | null;
}

function formatGbp(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? `£${n.toFixed(2)}` : `£${value}`;
}

export function CheckoutSummary({
  quote,
  paymentMode = 'FULL',
  depositAmountGbp = null,
  balanceDueGbp = null,
}: CheckoutSummaryProps) {
  const { tyre, pricing, availability, isSpecialOrder, jobType, backupTyre } = quote;
  const isAssessment = jobType === 'ASSESSMENT';
  const isDeposit = paymentMode === 'DEPOSIT';
  return (
    <Stack
      gap="4"
      p={{ base: '4', md: '6' }}
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.gold"
      bg="bg.surface"
    >
      <Stack gap="1">
        <Text color="fg.muted" fontSize="sm">
          {isAssessment ? 'Booking type' : 'Selected tyre'}
        </Text>
        {isAssessment ? (
          <>
            <Text fontFamily="heading" color="fg.default" fontSize="lg">
              Emergency tyre assessment
            </Text>
            <Text color="fg.muted" fontSize="sm">
              We will inspect the tyre on site and repair it if it is safe. Replacement tyres
              are quoted separately if needed.
            </Text>
            {backupTyre ? (
              <Text color="accent.neon" fontSize="sm">
                Backup tyre noted: {backupTyre.brand} {backupTyre.model} ({backupTyre.sizeLabel}) —
                not charged unless fitted on site.
              </Text>
            ) : null}
          </>
        ) : tyre ? (
          <>
            <Text fontFamily="heading" color="fg.default" fontSize="lg">
              {tyre.brand} {tyre.model}
            </Text>
            <Text color="fg.muted" fontSize="sm">
              {tyre.sizeLabel}
              {tyre.speedRating ? ` · ${tyre.speedRating}` : ''}
              {tyre.loadIndex ? ` · LI ${tyre.loadIndex}` : ''}
            </Text>
            {isSpecialOrder ? (
              <Text color="accent.neon" fontSize="sm">
                {SPECIAL_ORDER_COPY}
              </Text>
            ) : (
              <Text color="fg.muted" fontSize="sm">
                {availabilityLabel(availability)}
              </Text>
            )}
          </>
        ) : null}
      </Stack>

      <Box borderTopWidth="1px" borderColor="border.subtle" pt="4">
        <Stack gap="2">
          <SummaryRow
            label={isAssessment ? 'Assessment fee' : 'Tyre price'}
            value={formatGbp(pricing.basePriceGbp)}
          />
          <SummaryRow label="Distance fee" value={formatGbp(pricing.distanceFeeGbp)} />
          <Flex
            justify="space-between"
            pt="2"
            borderTopWidth="1px"
            borderColor="border.subtle"
          >
            <Text fontFamily="heading" color="fg.default" fontSize="lg">
              Total job price
            </Text>
            <Text fontFamily="heading" color="fg.default" fontSize="lg">
              {formatGbp(pricing.totalPriceGbp)}
            </Text>
          </Flex>
          {isDeposit && depositAmountGbp ? (
            <>
              <SummaryRow
                label="15% dispatch deposit due now"
                value={formatGbp(depositAmountGbp)}
              />
              <SummaryRow
                label="Balance due before completion"
                value={formatGbp(balanceDueGbp ?? '0.00')}
              />
              <Flex
                justify="space-between"
                pt="2"
                borderTopWidth="1px"
                borderColor="border.subtle"
              >
                <Text fontFamily="heading" color="fg.default" fontSize="lg">
                  Pay now
                </Text>
                <Text fontFamily="heading" color="accent.neon" fontSize="xl">
                  {formatGbp(depositAmountGbp)}
                </Text>
              </Flex>
            </>
          ) : (
            <Flex
              justify="space-between"
              pt="2"
              borderTopWidth="1px"
              borderColor="border.subtle"
            >
              <Text fontFamily="heading" color="fg.default" fontSize="lg">
                Pay now
              </Text>
              <Text fontFamily="heading" color="accent.neon" fontSize="xl">
                {formatGbp(pricing.totalPriceGbp)}
              </Text>
            </Flex>
          )}
          <Text color="fg.muted" fontSize="xs">
            No VAT — we are not VAT registered.
          </Text>
        </Stack>
      </Box>

      <Text color="fg.muted" fontSize="xs">
        Your tracking link will be available after payment is confirmed.
      </Text>
    </Stack>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between">
      <Text color="fg.muted" fontSize="sm">
        {label}
      </Text>
      <Text color="fg.default" fontSize="sm">
        {value}
      </Text>
    </Flex>
  );
}
