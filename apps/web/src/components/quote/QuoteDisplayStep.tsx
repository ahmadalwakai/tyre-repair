'use client';
import { useEffect, useState } from 'react';
import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';
import { QuoteSummaryCard } from './QuoteSummaryCard';
import { QuoteErrorState } from './QuoteErrorState';
import { QuoteGeneratingAnimation } from './QuoteGeneratingAnimation';
import type { TyrePayload } from './TyreSelectionStep';
import type {
  AddressData,
  CreateQuoteInput,
  QuoteDisplayData,
} from '@/types/quote';

export interface QuoteDisplayStepProps {
  address: AddressData;
  tyre: TyrePayload;
  onBack: () => void;
}

/**
 * Final step of the customer quote flow. Plays a brief generating animation
 * (~1.8s, or instantly when reduced motion is preferred), then fades in the
 * priced quote card and a button to continue to /checkout.
 */
export function QuoteDisplayStep({ address, tyre, onBack }: QuoteDisplayStepProps) {
  const [ready, setReady] = useState(false);
  const [quote, setQuote] = useState<QuoteDisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Kick off the quote request immediately. The animation runs in parallel
  // with the network call; we only reveal the card once both have finished.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      const body: CreateQuoteInput = {
        jobType: 'REPLACEMENT',
        tyreId: tyre.selected.id,
        lockingWheelNutStatus: tyre.lockingWheelNutStatus,
      };
      if (
        address.method === 'manual_address' &&
        address.addressLine1 &&
        address.city &&
        address.postcode
      ) {
        const m: NonNullable<CreateQuoteInput['manualLocation']> = {
          addressLine1: address.addressLine1,
          city: address.city,
          postcode: address.postcode,
        };
        if (address.addressLine2) m.addressLine2 = address.addressLine2;
        if (typeof address.latitude === 'number') m.latitude = address.latitude;
        if (typeof address.longitude === 'number') m.longitude = address.longitude;
        body.manualLocation = m;
      } else if (address.locationId) {
        body.locationId = address.locationId;
      } else if (address.addressLine1 && address.city && address.postcode) {
        body.manualLocation = {
          addressLine1: address.addressLine1,
          city: address.city,
          postcode: address.postcode,
          ...(address.addressLine2 ? { addressLine2: address.addressLine2 } : {}),
          ...(typeof address.latitude === 'number' ? { latitude: address.latitude } : {}),
          ...(typeof address.longitude === 'number'
            ? { longitude: address.longitude }
            : {}),
        };
      }

      try {
        const res = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data: QuoteDisplayData | { error: string } = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError((data as { error: string }).error || 'Could not create quote.');
          return;
        }
        setQuote(data as QuoteDisplayData);
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
  }, [address, tyre, attempt]);

  if (error) {
    return (
      <QuoteErrorState
        message="Something went wrong, please try again or call us."
        onRetry={() => {
          setReady(false);
          setQuote(null);
          setAttempt((a) => a + 1);
        }}
      />
    );
  }

  // Show the animation until BOTH the network and animation are done.
  const showAnimation = !ready || loading || !quote;

  return (
    <Stack gap="4">
      {showAnimation && <QuoteGeneratingAnimation onComplete={() => setReady(true)} />}

      {!showAnimation && quote && (
        <Box
          opacity={1}
          transform="translateY(0)"
          transition="opacity 0.3s ease, transform 0.3s ease"
          style={{ animation: 'fadeIn 0.3s ease' }}
        >
          <Stack gap="4">
            <QuoteSummaryCard quote={quote} />
            {(() => {
              const safety = quote.pricingSafetyPublic;
              const paymentBlocked = safety ? !safety.publicPaymentAllowed : false;
              if (paymentBlocked && safety?.customerMessage) {
                return (
                  <Text color="fg.default" fontSize="md" role="status">
                    {safety.customerMessage}
                  </Text>
                );
              }
              return null;
            })()}
            <HStack gap="3" wrap="wrap">
              {quote.pricingSafetyPublic &&
              !quote.pricingSafetyPublic.publicPaymentAllowed ? (
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
                  <GoldButton
                    href={`/checkout?quoteId=${quote.quoteId}`}
                    variant="solid"
                  >
                    Pay & confirm
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
        </Box>
      )}
    </Stack>
  );
}
