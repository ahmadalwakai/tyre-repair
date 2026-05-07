'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Box,
  Button,
  Field,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { CheckoutQuoteSummary } from '@/lib/checkout/types';
import type { LockingWheelNutStatus } from '@/lib/bookings/types';
import { CheckoutErrorState } from './CheckoutErrorState';
import { CheckoutLoadingState } from './CheckoutLoadingState';
import { PaymentStatusCard } from './PaymentStatusCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { siteConfig } from '@/lib/site-config';

export type CheckoutPaymentMode = 'FULL' | 'DEPOSIT';

export interface CheckoutSessionInfo {
  paymentMode: CheckoutPaymentMode;
  chargeAmountGbp: string;
  depositAmountGbp: string | null;
  balanceDueGbp: string | null;
}

interface CollectModeProps {
  mode: 'collect';
  quote: CheckoutQuoteSummary;
  clientSecret: null;
  paymentMode: CheckoutPaymentMode;
  onPaymentModeChange: (mode: CheckoutPaymentMode) => void;
  onClientSecret: (clientSecret: string, info: CheckoutSessionInfo) => void;
}

interface ConfirmModeProps {
  mode: 'confirm';
  quote: CheckoutQuoteSummary;
  clientSecret: string;
  paymentMode: CheckoutPaymentMode;
  chargeAmountGbp: string | null;
  onResetClientSecret: () => void;
}

export type CheckoutClientProps = CollectModeProps | ConfirmModeProps;

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
}

interface SessionResponse {
  trackingId: string;
  clientSecret: string;
  amountGbp: string;
  checkoutPaymentMode?: 'FULL' | 'DEPOSIT';
  depositAmountGbp?: string | null;
  balanceDueGbp?: string | null;
  totalPriceGbp?: string;
}

const ERROR_COPY: Record<string, string> = {
  quote_expired:
    'This quote has expired. Please start a new emergency quote to get a fresh price.',
  quote_already_booked:
    'This quote has already been used. Please start a new quote to continue.',
  quote_not_found: 'We couldn\u2019t find that quote. Please start a new emergency quote.',
  tyre_unavailable:
    'This tyre is no longer available. Please start a new quote to choose another option.',
  stripe_failed:
    'We couldn\u2019t reach our payment provider. Please try again, or call us to book.',
  db_error: 'Something went wrong saving your booking. Please try again or call us.',
  tracking_collision:
    'A temporary error allocated your tracking reference. Please try again.',
  locking_nut_key_missing:
    'You must call us before completing your booking. We cannot process payment online without the locking nut key.',
};

function isCustomerFormValid(form: CustomerForm): boolean {
  if (form.name.trim().length < 2) return false;
  // Require at least 7 digits in the phone number (UK mobile minimum is 11 incl. leading 0).
  const digits = form.phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return false;
  if (!/^\+?[0-9 ()-]{7,20}$/.test(form.phone.trim())) return false;
  // Tighter email check: at least one dot in the domain and ≥2-char TLD.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return false;
  return true;
}

export function CheckoutClient(props: CheckoutClientProps) {
  if (props.mode === 'collect') {
    return <CollectStage {...props} />;
  }
  return <ConfirmStage {...props} />;
}

function CollectStage({ quote, paymentMode, onPaymentModeChange, onClientSecret }: CollectModeProps) {
  const [form, setForm] = useState<CustomerForm>({ name: '', phone: '', email: '' });
  // Intentionally null — the customer must explicitly pick one of the three
  // options. There is no safe default for locking wheel nuts.
  const [lockingNutStatus, setLockingNutStatus] =
    useState<LockingWheelNutStatus | null>(null);
  const [acceptedDepositTerms, setAcceptedDepositTerms] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fire a transient "customer has reached checkout" signal once per mount
  // so the admin gets an early heads-up banner. Best-effort — never blocks UI.
  const checkoutSignalSent = useRef(false);
  useEffect(() => {
    if (checkoutSignalSent.current) return;
    checkoutSignalSent.current = true;
    void fetch('/api/lead-events/checkout-started', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        jobType: quote.jobType,
        tyreProblemType: quote.tyreProblemType,
        totalPriceGbp: quote.pricing.totalPriceGbp,
        paymentMode,
        page: '/checkout',
      }),
    }).catch(() => {
      // best-effort — admin heads-up only
    });
  }, [quote.quoteId, quote.jobType, quote.tyreProblemType, quote.pricing.totalPriceGbp, paymentMode]);

  const total = Number(quote.pricing.totalPriceGbp || '0');
  const depositAmount = Math.max(10, total * 0.15);
  const cappedDeposit = Math.min(depositAmount, total);
  const balanceDue = Math.max(0, total - cappedDeposit);
  const isAssessment = quote.jobType === 'ASSESSMENT';
  // Deposit is only meaningful for REPLACEMENT bookings (assessment fee is small).
  const depositAvailable = !isAssessment && total >= 50;

  const showNoKeyWarning = lockingNutStatus === 'NO_KEY';
  const showMissingNutChoice = submitAttempted && lockingNutStatus === null;
  const depositTermsMissing =
    submitAttempted && paymentMode === 'DEPOSIT' && !acceptedDepositTerms;
  const valid =
    isCustomerFormValid(form) &&
    lockingNutStatus !== null &&
    lockingNutStatus !== 'NO_KEY' &&
    (paymentMode === 'FULL' || acceptedDepositTerms);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!valid || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          customerName: form.name.trim(),
          customerPhone: form.phone.trim(),
          customerEmail: form.email.trim(),
          lockingWheelNutStatus: lockingNutStatus,
          checkoutPaymentMode: depositAvailable ? paymentMode : 'FULL',
          ...(depositAvailable && paymentMode === 'DEPOSIT'
            ? { customerAcceptedDepositTerms: true }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<SessionResponse> & {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        const code = data.code ?? '';
        setErrorMessage(ERROR_COPY[code] ?? data.error ?? 'Could not start checkout.');
        return;
      }
      if (!data.clientSecret || !data.trackingId || !data.amountGbp) {
        setErrorMessage('Could not start checkout. Please try again.');
        return;
      }
      // Stash trackingId on window for the confirm stage redirect.
      try {
        window.sessionStorage.setItem('tyrerepair:trackingId', data.trackingId);
      } catch {
        /* sessionStorage unavailable */
      }
      onClientSecret(data.clientSecret, {
        paymentMode: data.checkoutPaymentMode ?? 'FULL',
        chargeAmountGbp: data.amountGbp,
        depositAmountGbp: data.depositAmountGbp ?? null,
        balanceDueGbp: data.balanceDueGbp ?? null,
      });
    } catch {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      bg="bg.surface"
      p={{ base: '4', md: '6' }}
    >
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="4">
          <Text fontFamily="heading" color="accent.neon" fontSize="lg">
            Your contact details
          </Text>
          <Field.Root required invalid={submitAttempted && form.name.trim().length < 2}>
            <Field.Label color="fg.default">Full name</Field.Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoComplete="name"
              required
              minLength={2}
              maxLength={160}
            />
            <Field.ErrorText>Please enter your full name.</Field.ErrorText>
          </Field.Root>
          <Field.Root
            required
            invalid={submitAttempted && !/^\+?[0-9 ()-]{7,20}$/.test(form.phone.trim())}
          >
            <Field.Label color="fg.default">Mobile phone</Field.Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              type="tel"
              autoComplete="tel"
              required
              placeholder="07…"
            />
            <Field.HelperText color="fg.muted">
              We&apos;ll text you the tracking link.
            </Field.HelperText>
            <Field.ErrorText>Please enter a valid UK mobile number.</Field.ErrorText>
          </Field.Root>
          <Field.Root
            required
            invalid={
              submitAttempted &&
              !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())
            }
          >
            <Field.Label color="fg.default">Email</Field.Label>
            <Input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              type="email"
              autoComplete="email"
              required
            />
            <Field.HelperText color="fg.muted">
              Booking confirmation will be sent here.
            </Field.HelperText>
            <Field.ErrorText>Please enter a valid email address.</Field.ErrorText>
          </Field.Root>

          <Box
            borderWidth="1px"
            borderColor={showMissingNutChoice ? 'red.400' : 'border.subtle'}
            borderRadius="md"
            bg="bg.canvas"
            p={{ base: '3', md: '4' }}
          >
            <Stack gap="3">
              <Text fontFamily="heading" color="accent.neon" fontSize="md">
                Locking Wheel Nuts <Text as="span" color="red.300">*</Text>
              </Text>
              <Text color="fg.muted" fontSize="sm">
                Some vehicles use a special locking nut on each wheel. Tell us
                what applies so the fitter brings the right tooling.
              </Text>
              <Stack as="fieldset" gap="2" borderWidth="0">
                {(
                  [
                    {
                      value: 'HAVE_KEY' as const,
                      label: 'Yes, I have it',
                      hint: 'The locking nut key is in my car.',
                    },
                    {
                      value: 'NO_KEY' as const,
                      label: "No, I don't have it",
                      hint: 'I cannot find the locking nut key.',
                    },
                    {
                      value: 'STANDARD_ONLY' as const,
                      label: 'Standard nuts only',
                      hint: 'No special key needed.',
                    },
                  ]
                ).map((opt) => {
                  const isActive = lockingNutStatus === opt.value;
                  return (
                    <Box
                      as="label"
                      key={opt.value}
                      borderWidth="1px"
                      borderColor={isActive ? 'border.gold' : 'border.subtle'}
                      borderRadius="md"
                      bg={isActive ? 'bg.surface' : 'transparent'}
                      p="3"
                      cursor="pointer"
                      display="flex"
                      gap="3"
                      alignItems="flex-start"
                    >
                      <input
                        type="radio"
                        name="lockingWheelNutStatus"
                        value={opt.value}
                        checked={isActive}
                        onChange={() => setLockingNutStatus(opt.value)}
                        aria-label={opt.label}
                        style={{ marginTop: '4px', accentColor: '#FFD700' }}
                      />
                      <Stack gap="0">
                        <Text color="fg.default" fontWeight="600" fontSize="sm">
                          {opt.label}
                        </Text>
                        <Text color="fg.muted" fontSize="xs">
                          {opt.hint}
                        </Text>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
              {showMissingNutChoice ? (
                <Text
                  role="alert"
                  color="red.300"
                  fontSize="sm"
                  fontWeight="600"
                  data-testid="locking-nut-required"
                >
                  Please choose one of the options above before continuing.
                </Text>
              ) : null}
            </Stack>
          </Box>

          {showNoKeyWarning ? (
            <Box
              role="alert"
              borderWidth="1px"
              borderColor="red.400"
              bg="rgba(220,38,38,0.08)"
              color="red.200"
              borderRadius="md"
              p={{ base: '3', md: '4' }}
            >
              <Stack gap="2">
                <Text fontWeight="700" color="red.300">
                  Please call us before booking
                </Text>
                <Text fontSize="sm">
                  You must call us before completing your booking. Call{' '}
                  <a
                    href={siteConfig.phoneHref}
                    style={{ color: '#FFD700', textDecoration: 'underline' }}
                  >
                    {siteConfig.phoneDisplay}
                  </a>{' '}
                  or WhatsApp{' '}
                  <a
                    href={siteConfig.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#FFD700', textDecoration: 'underline' }}
                  >
                    {siteConfig.whatsappDisplay}
                  </a>
                  . We cannot process payment online without the locking nut key.
                </Text>
              </Stack>
            </Box>
          ) : null}

          {errorMessage ? (
            <CheckoutErrorState message={errorMessage} />
          ) : null}

          {depositAvailable ? (
            <Box
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="md"
              bg="bg.canvas"
              p={{ base: '3', md: '4' }}
            >
              <Stack gap="3">
                <Text fontFamily="heading" color="accent.neon" fontSize="md">
                  How would you like to pay?
                </Text>
                {(
                  [
                    {
                      value: 'FULL' as const,
                      label: 'Pay full amount',
                      hint: `Pay £${total.toFixed(2)} now — nothing left to pay on the day.`,
                    },
                    {
                      value: 'DEPOSIT' as const,
                      label: 'Pay 15% dispatch deposit',
                      hint: `Pay £${cappedDeposit.toFixed(2)} now to secure dispatch. Balance of £${balanceDue.toFixed(2)} due before the job is completed.`,
                    },
                  ]
                ).map((opt) => {
                  const isActive = paymentMode === opt.value;
                  return (
                    <Box
                      as="label"
                      key={opt.value}
                      borderWidth="1px"
                      borderColor={isActive ? 'border.gold' : 'border.subtle'}
                      borderRadius="md"
                      bg={isActive ? 'bg.surface' : 'transparent'}
                      p="3"
                      cursor="pointer"
                      display="flex"
                      gap="3"
                      alignItems="flex-start"
                    >
                      <input
                        type="radio"
                        name="checkoutPaymentMode"
                        value={opt.value}
                        checked={isActive}
                        onChange={() => onPaymentModeChange(opt.value)}
                        aria-label={opt.label}
                        style={{ marginTop: '4px', accentColor: '#FFD700' }}
                      />
                      <Stack gap="0">
                        <Text color="fg.default" fontWeight="600" fontSize="sm">
                          {opt.label}
                        </Text>
                        <Text color="fg.muted" fontSize="xs">
                          {opt.hint}
                        </Text>
                      </Stack>
                    </Box>
                  );
                })}
                {paymentMode === 'DEPOSIT' ? (
                  <Box
                    as="label"
                    borderWidth="1px"
                    borderColor={depositTermsMissing ? 'red.400' : 'border.subtle'}
                    borderRadius="md"
                    bg="bg.surface"
                    p="3"
                    display="flex"
                    gap="3"
                    alignItems="flex-start"
                    cursor="pointer"
                  >
                    <input
                      type="checkbox"
                      checked={acceptedDepositTerms}
                      onChange={(e) => setAcceptedDepositTerms(e.target.checked)}
                      aria-label="Accept dispatch deposit terms"
                      style={{ marginTop: '4px', accentColor: '#FFD700' }}
                    />
                    <Text color="fg.default" fontSize="sm">
                      I understand this is an emergency service. I request
                      TyreRepair UK to begin arranging dispatch immediately and
                      understand the 15% dispatch deposit is non-refundable once
                      dispatch or work has started, subject to the{' '}
                      <a
                        href="/cancellation-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#FFD700', textDecoration: 'underline' }}
                      >
                        cancellation policy
                      </a>
                      .
                    </Text>
                  </Box>
                ) : null}
                {depositTermsMissing ? (
                  <Text role="alert" color="red.300" fontSize="sm" fontWeight="600">
                    Please tick the box above to accept the dispatch deposit terms.
                  </Text>
                ) : null}
              </Stack>
            </Box>
          ) : null}

          <Button
            type="submit"
            disabled={submitting || lockingNutStatus === 'NO_KEY'}
            bg="accent.neon"
            color="black"
            fontFamily="heading"
            _hover={{ bg: 'accent.neon' }}
            loading={submitting}
            loadingText="Preparing secure payment…"
          >
            {depositAvailable && paymentMode === 'DEPOSIT'
              ? `Continue to pay £${cappedDeposit.toFixed(2)} deposit`
              : 'Continue to payment'}
          </Button>
          <Text color="fg.muted" fontSize="xs">
            Card payment is processed securely by Stripe. We never see your card details.
          </Text>
        </Stack>
      </form>
    </Box>
  );
}

function ConfirmStage({
  quote,
  clientSecret: _clientSecret,
  paymentMode,
  chargeAmountGbp,
  onResetClientSecret,
}: ConfirmModeProps) {
  void _clientSecret;
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<
    'idle' | 'processing' | 'requires_action' | 'succeeded' | 'failed'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!stripe || !elements) {
    return <CheckoutLoadingState message="Loading secure payment…" />;
  }

  async function handleConfirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setStatus('processing');
    setErrorMessage(null);

    const trackingId =
      (typeof window !== 'undefined' &&
        window.sessionStorage.getItem('tyrerepair:trackingId')) ||
      '';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    const returnUrl = `${siteUrl || window.location.origin}/checkout/success?trackingId=${encodeURIComponent(trackingId)}`;

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    if (result.error) {
      setStatus('failed');
      setErrorMessage(result.error.message ?? 'Payment failed.');
    }
    // On success, Stripe redirects to return_url.
  }

  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      bg="bg.surface"
      p={{ base: '4', md: '6' }}
    >
      <form onSubmit={handleConfirm}>
        <Stack gap="4">
          <Text fontFamily="heading" color="accent.neon" fontSize="lg">
            {quote.jobType === 'ASSESSMENT'
              ? 'Payment for emergency tyre assessment'
              : `Payment for ${quote.tyre?.brand ?? ''} ${quote.tyre?.model ?? ''}`.trim()}
          </Text>
          <PaymentElement />
          <PaymentStatusCard
            status={status}
            {...(errorMessage ? { message: errorMessage } : {})}
          />
          <Button
            type="submit"
            bg="accent.neon"
            color="black"
            fontFamily="heading"
            disabled={status === 'processing'}
            loading={status === 'processing'}
            loadingText="Processing payment…"
          >
            {paymentMode === 'DEPOSIT'
              ? `Pay £${Number(chargeAmountGbp ?? '0').toFixed(2)} deposit now`
              : `Pay £${Number(chargeAmountGbp ?? quote.pricing.totalPriceGbp).toFixed(2)} now`}
          </Button>
          <Stack direction={{ base: 'column', sm: 'row' }} gap="2">
            <GoldButton
              variant="ghost"
              onClick={() => onResetClientSecret()}
            >
              Edit contact details
            </GoldButton>
            <GoldButton href={siteConfig.phoneHref} variant="outline">
              {siteConfig.secondaryCtaLabel}
            </GoldButton>
          </Stack>
        </Stack>
      </form>
    </Box>
  );
}
