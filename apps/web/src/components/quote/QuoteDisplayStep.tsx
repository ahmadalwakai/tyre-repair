'use client';
import { useEffect, useState } from 'react';
import { HStack, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';
import { QuoteSummaryCard } from './QuoteSummaryCard';
import { QuoteErrorState } from './QuoteErrorState';
import { QuoteLoadingState } from './QuoteLoadingState';
import type { TyreTriageResult } from './TyreSelectionStep';
import type {
  CapturedLocation,
  CreateQuoteInput,
  QuoteDisplayData,
  VehicleSelection,
} from '@/types/quote';

export interface QuoteDisplayStepProps {
  vehicle: VehicleSelection | null;
  triage: TyreTriageResult;
  location: CapturedLocation | null;
  onBack: () => void;
}

export function QuoteDisplayStep({ vehicle, triage, location, onBack }: QuoteDisplayStepProps) {
  const [quote, setQuote] = useState<QuoteDisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      const body: CreateQuoteInput = {
        jobType: triage.jobType,
        tyreProblemType: triage.tyreProblemType,
      };
      if (triage.selectedTyre) body.tyreId = triage.selectedTyre.tyreId;
      if (triage.backupTyre) body.backupTyreId = triage.backupTyre.tyreId;
      if (vehicle?.registration) body.vehicleRegistration = vehicle.registration;
      if (vehicle?.make) body.vehicleMake = vehicle.make;
      if (vehicle?.model) body.vehicleModel = vehicle.model;
      if (vehicle?.year) body.vehicleYear = vehicle.year;
      if (location?.locationId) body.locationId = location.locationId;
      if (
        !location?.locationId &&
        location?.method === 'manual_address' &&
        location.addressLine1 &&
        location.city &&
        location.postcode
      ) {
        const m: CreateQuoteInput['manualLocation'] = {
          addressLine1: location.addressLine1,
          city: location.city,
          postcode: location.postcode,
        };
        if (location.addressLine2) m.addressLine2 = location.addressLine2;
        body.manualLocation = m;
      }

      try {
        const res = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data: QuoteDisplayData | { error: string } = await res.json();
        if (!res.ok) {
          if (!cancelled) setError((data as { error: string }).error || 'Could not create quote.');
          return;
        }
        if (!cancelled) setQuote(data as QuoteDisplayData);
      } catch {
        if (!cancelled) setError('Could not create quote. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [triage, vehicle, location, attempt]);

  if (loading) return <QuoteLoadingState message="Building your emergency quote…" />;
  if (error)
    return (
      <QuoteErrorState
        message="Something went wrong, please try again or call us."
        onRetry={() => setAttempt((a) => a + 1)}
      />
    );
  if (!quote) return null;

  const safety = quote.pricingSafetyPublic;
  const paymentBlocked = safety ? !safety.publicPaymentAllowed : false;

  return (
    <Stack gap="4">
      <QuoteSummaryCard quote={quote} />
      {paymentBlocked && safety?.customerMessage ? (
        <Text color="fg.default" fontSize="md" role="status">
          {safety.customerMessage}
        </Text>
      ) : null}
      <HStack gap="3" wrap="wrap">
        {paymentBlocked ? (
          <>
            <GoldButton href={siteConfig.phoneHref} variant="solid">
              Call {siteConfig.phoneDisplay}
            </GoldButton>
            <GoldButton href={siteConfig.whatsappHref} variant="outline">
              {siteConfig.whatsappCtaLabel}
            </GoldButton>
          </>
        ) : (
          <>
            <GoldButton href={`/checkout?quoteId=${quote.quoteId}`} variant="solid">
              Continue to secure payment
            </GoldButton>
            <GoldButton href={siteConfig.phoneHref} variant="outline">
              {siteConfig.secondaryCtaLabel}
            </GoldButton>
          </>
        )}
        <GoldButton onClick={onBack} variant="ghost">
          Back
        </GoldButton>
      </HStack>
    </Stack>
  );
}
