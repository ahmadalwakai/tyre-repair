'use client';
import { useMemo, useState } from 'react';
import { Box, Grid, GridItem, Heading, Stack, Text } from '@chakra-ui/react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import type { CheckoutQuoteSummary } from '@/lib/checkout/types';
import { CheckoutSummary } from './CheckoutSummary';
import { CheckoutClient } from './CheckoutClient';
import { CheckoutErrorState } from './CheckoutErrorState';

export interface CheckoutShellProps {
  quote: CheckoutQuoteSummary;
}

export function CheckoutShell({ quote }: CheckoutShellProps) {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'DEPOSIT'>('FULL');
  const [depositAmountGbp, setDepositAmountGbp] = useState<string | null>(null);
  const [balanceDueGbp, setBalanceDueGbp] = useState<string | null>(null);
  const [chargeAmountGbp, setChargeAmountGbp] = useState<string | null>(null);

  const stripePromise = useMemo<Promise<Stripe | null> | null>(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

  if (!publishableKey || !stripePromise) {
    if (typeof window === 'undefined') {
      // Server-render path: emit a one-line warning so the cause is
      // immediately visible in server logs. Never logs values.
      // eslint-disable-next-line no-console
      console.warn(
        '[checkout] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set — rendering "Payment temporarily unavailable" fallback.',
      );
    }
    return (
      <CheckoutErrorState
        title="Payment temporarily unavailable"
        message="Card payments are temporarily unavailable. Please call us to book your emergency callout."
      />
    );
  }

  return (
    <Stack gap="6">
      <Stack gap="2">
        <Heading as="h1" color="accent.neon" fontFamily="heading">
          Secure emergency checkout
        </Heading>
        <Text color="fg.muted">
          Enter your contact details and pay securely. Your tracking link will arrive
          after payment is confirmed.
        </Text>
      </Stack>
      <Grid
        templateColumns={{ base: '1fr', md: '1fr 1fr' }}
        gap={{ base: '6', md: '8' }}
      >
        <GridItem order={{ base: 2, md: 1 }}>
          <Box>
            {clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: { theme: 'night', labels: 'floating' },
                }}
              >
                <CheckoutClient
                  quote={quote}
                  clientSecret={clientSecret}
                  mode="confirm"
                  paymentMode={paymentMode}
                  chargeAmountGbp={chargeAmountGbp}
                  onResetClientSecret={() => setClientSecret(null)}
                />
              </Elements>
            ) : (
              <CheckoutClient
                quote={quote}
                clientSecret={null}
                mode="collect"
                paymentMode={paymentMode}
                onPaymentModeChange={setPaymentMode}
                onClientSecret={(secret, info) => {
                  setClientSecret(secret);
                  setDepositAmountGbp(info.depositAmountGbp);
                  setBalanceDueGbp(info.balanceDueGbp);
                  setChargeAmountGbp(info.chargeAmountGbp);
                  setPaymentMode(info.paymentMode);
                }}
              />
            )}
          </Box>
        </GridItem>
        <GridItem order={{ base: 1, md: 2 }}>
          <CheckoutSummary
            quote={quote}
            paymentMode={paymentMode}
            depositAmountGbp={depositAmountGbp}
            balanceDueGbp={balanceDueGbp}
          />
        </GridItem>
      </Grid>
    </Stack>
  );
}
