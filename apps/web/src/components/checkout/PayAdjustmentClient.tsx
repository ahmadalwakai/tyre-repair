'use client';
import { useEffect, useMemo, useState } from 'react';
import { Box, Heading, Stack, Text } from '@chakra-ui/react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { GoldButton } from '@/components/ui/GoldButton';

interface InitResponse {
  success: true;
  clientSecret: string;
  amountGbp: string;
  trackingId: string;
  customerName: string;
}

interface InitError {
  error: string;
  code?: string;
}

export interface PayAdjustmentClientProps {
  adjustmentId: string;
}

export function PayAdjustmentClient({ adjustmentId }: PayAdjustmentClientProps): React.JSX.Element {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const stripePromise = useMemo<Promise<Stripe | null> | null>(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

  const [data, setData] = useState<InitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/booking-adjustments/${adjustmentId}/payment`, {
          method: 'POST',
          cache: 'no-store',
        });
        const body = (await res.json()) as InitResponse | InitError;
        if (!res.ok || !('success' in body)) {
          if (!cancelled) {
            setError('error' in body ? body.error : 'Could not start payment');
          }
          return;
        }
        if (!cancelled) setData(body);
      } catch {
        if (!cancelled) setError('Could not start payment. Please try again.');
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [adjustmentId]);

  if (!publishableKey || !stripePromise) {
    return (
      <ErrorPanel message="Card payments are not configured right now. Please call us." />
    );
  }
  if (error) return <ErrorPanel message={error} />;
  if (!data) return <Text color="fg.muted">Loading secure payment…</Text>;

  return (
    <Stack gap="5">
      <Stack gap="1">
        <Heading as="h1" color="accent.neon" fontFamily="heading">
          Replacement tyre payment
        </Heading>
        <Text color="fg.muted">
          Booking {data.trackingId} — additional amount due £{data.amountGbp}
        </Text>
        <Text color="fg.muted" fontSize="sm">
          No VAT — we are not VAT registered.
        </Text>
      </Stack>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret: data.clientSecret,
          appearance: { theme: 'night', labels: 'floating' },
        }}
      >
        <PayForm amountGbp={data.amountGbp} />
      </Elements>
    </Stack>
  );
}

function PayForm({ amountGbp }: { amountGbp: string }): React.JSX.Element {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setMessage(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/track/__redirect__`,
      },
      redirect: 'if_required',
    });
    if (error) {
      setMessage(error.message ?? 'Payment failed');
      setSubmitting(false);
      return;
    }
    setMessage('Payment received. We will confirm your replacement booking shortly.');
    setSubmitting(false);
  };

  return (
    <Box
      as="form"
      onSubmit={onSubmit}
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      bg="bg.surface"
      p={{ base: '4', md: '6' }}
    >
      <Stack gap="4">
        <PaymentElement />
        {message ? (
          <Text
            color={message.startsWith('Payment received') ? 'accent.neon' : 'red.400'}
            fontSize="sm"
          >
            {message}
          </Text>
        ) : null}
        <GoldButton type="submit" disabled={!stripe || submitting}>
          {submitting ? 'Processing…' : `Pay £${amountGbp}`}
        </GoldButton>
      </Stack>
    </Box>
  );
}

function ErrorPanel({ message }: { message: string }): React.JSX.Element {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      bg="bg.surface"
      p="5"
    >
      <Text color="red.400">{message}</Text>
    </Box>
  );
}
