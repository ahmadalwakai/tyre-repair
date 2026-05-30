'use client';
/**
 * AdminPayClient — opened in the admin device browser via the URL returned
 * from POST /api/admin/quick-booking. Loads a Stripe PaymentIntent for the
 * booking via /api/bookings/[bookingId]/admin-take-payment, then renders a
 * standard Stripe Payment Element so the admin can take the card details
 * directly on the admin device. On success the customer is redirected to the
 * tracking page (same as PayBalance).
 *
 * This page is public (no admin cookie required) but the underlying API
 * strictly validates booking state before issuing a PaymentIntent.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Box, Button, Stack, Text } from '@chakra-ui/react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';

export interface AdminPayClientProps {
  bookingId: string;
}

interface SessionData {
  trackingId: string;
  clientSecret: string;
  amountGbp: string;
  customerName: string | null;
  paymentKind: 'deposit' | 'balance' | 'full';
}

export function AdminPayClient({ bookingId }: AdminPayClientProps) {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const stripePromise = useMemo<Promise<Stripe | null> | null>(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

  const [session, setSession] = useState<SessionData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/admin-take-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as Partial<SessionData> & {
          error?: string;
          code?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.clientSecret || !data.trackingId) {
          if (data.code === 'already_paid') {
            setLoadError('This booking is already fully paid. No further action needed.');
          } else if (data.code === 'no_amount_due') {
            setLoadError('There is no outstanding amount on this booking.');
          } else {
            setLoadError(data.error ?? 'Could not start card payment.');
          }
          return;
        }
        setSession({
          trackingId: data.trackingId,
          clientSecret: data.clientSecret,
          amountGbp: data.amountGbp ?? '0.00',
          customerName: data.customerName ?? null,
          paymentKind: data.paymentKind ?? 'full',
        });
      } catch {
        if (!cancelled) setLoadError('Network error. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (!publishableKey || !stripePromise) {
    return (
      <Box bg="black" color="white" minH="60vh" p={8}>
        <Text color="red.300">
          Card payments are not configured right now. Please collect cash on site
          or send the customer a payment link.
        </Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box bg="black" color="white" minH="60vh" p={8}>
        <Text color="fg.muted">Preparing secure card payment…</Text>
      </Box>
    );
  }
  if (loadError || !session) {
    return (
      <Box bg="black" color="white" minH="60vh" p={8}>
        <Text color="red.300">{loadError ?? 'Unable to load card payment.'}</Text>
      </Box>
    );
  }

  const heading =
    session.paymentKind === 'deposit'
      ? '15% deposit'
      : session.paymentKind === 'balance'
        ? 'Outstanding balance'
        : 'Full payment';

  return (
    <Box bg="black" color="white" minH="100vh" py={{ base: 8, md: 16 }}>
      <Box maxW="lg" mx="auto" px={4}>
        <Stack gap={6}>
          <Stack gap={1}>
            <Text fontFamily="heading" color="accent.solid" fontSize="2xl">
              Take card payment ({heading})
            </Text>
            <Text color="gray.300">
              {session.customerName ? `Customer: ${session.customerName}. ` : ''}Amount
              to charge:{' '}
              <Text as="span" color="accent.solid" fontWeight="bold">
                £{Number(session.amountGbp).toFixed(2)}
              </Text>
              .
            </Text>
            <Text color="gray.400" fontSize="sm">
              Tracking ID: {session.trackingId}
            </Text>
          </Stack>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: session.clientSecret,
              appearance: { theme: 'night', labels: 'floating' },
            }}
          >
            <AdminPayForm
              trackingId={session.trackingId}
              amountGbp={session.amountGbp}
            />
          </Elements>
        </Stack>
      </Box>
    </Box>
  );
}

interface AdminPayFormProps {
  trackingId: string;
  amountGbp: string;
}

function AdminPayForm({ trackingId, amountGbp }: AdminPayFormProps) {
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
    const returnUrl = `${siteUrl || window.location.origin}/track/${encodeURIComponent(trackingId)}`;
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (result.error) {
      setStatus('failed');
      setErrorMessage(result.error.message ?? 'Payment failed.');
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Stack gap={4}>
        <PaymentElement />
        {errorMessage ? (
          <Text role="alert" color="red.300">
            {errorMessage}
          </Text>
        ) : null}
        <Button
          type="submit"
          bg="accent.solid"
          color="white"
          fontFamily="heading"
          disabled={status === 'processing' || !stripe || !elements}
          loading={status === 'processing'}
          loadingText="Processing payment…"
        >
          Charge £{Number(amountGbp).toFixed(2)}
        </Button>
        <Text color="gray.400" fontSize="xs">
          Card payment is processed securely by Stripe. Card details are entered
          directly on this page and never seen by us.
        </Text>
      </Stack>
    </form>
  );
}
