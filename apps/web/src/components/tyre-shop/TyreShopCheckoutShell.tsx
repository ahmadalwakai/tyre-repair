'use client';
/**
 * Stripe Payment Element shell for the Tyre Shop flow.
 *
 * Mirrors the existing emergency CheckoutShell pattern but is dedicated to
 * the retail tyre flow so we don't entangle the two. Keying off the
 * clientSecret returned by /api/tyre-shop/orders. On success Stripe
 * redirects to /track/[trackingId].
 */
import { useMemo, useState, type FormEvent } from 'react';
import { Box, Button, Stack, Text } from '@chakra-ui/react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';

export interface TyreShopCheckoutShellProps {
  clientSecret: string;
  trackingId: string;
  bookingId: string;
}

export function TyreShopCheckoutShell(props: TyreShopCheckoutShellProps) {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const stripePromise = useMemo<Promise<Stripe | null> | null>(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

  if (!publishableKey || !stripePromise) {
    return (
      <Box
        borderWidth="1px"
        borderColor="border.subtle"
        p="6"
        borderRadius="md"
        bg="bg.subtle"
      >
        <Text color="red.300">
          Payment is temporarily unavailable. Please call us to complete your order.
        </Text>
      </Box>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: { theme: 'night', labels: 'floating' },
      }}
    >
      <TyreShopPaymentForm trackingId={props.trackingId} bookingId={props.bookingId} />
    </Elements>
  );
}

function TyreShopPaymentForm({
  trackingId,
}: {
  trackingId: string;
  bookingId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<'idle' | 'processing' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setStatus('processing');
    setErrorMessage(null);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    const origin = siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const returnUrl = `${origin}/track/${encodeURIComponent(trackingId)}`;
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (result.error) {
      setStatus('failed');
      setErrorMessage(result.error.message ?? 'Payment failed.');
    }
    // On success Stripe redirects to return_url.
  }

  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      p="4"
      borderRadius="md"
      bg="bg.subtle"
    >
      <form onSubmit={onSubmit}>
        <Stack gap="4">
          <PaymentElement />
          {errorMessage ? (
            <Text role="alert" color="red.300">
              {errorMessage}
            </Text>
          ) : null}
          <Button
            type="submit"
            bg="brand.gold"
            color="black"
            fontFamily="heading"
            disabled={status === 'processing' || !stripe || !elements}
            loading={status === 'processing'}
            loadingText="Processing payment…"
          >
            Pay securely
          </Button>
          <Text color="gray.400" fontSize="xs">
            Card payment is processed securely by Stripe. We never see your card details.
          </Text>
        </Stack>
      </form>
    </Box>
  );
}
