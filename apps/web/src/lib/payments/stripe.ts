import Stripe from 'stripe';
import type {
  CreateBookingPaymentIntentInput,
  CreateBookingPaymentIntentResult,
} from './types';

let cached: Stripe | null = null;
let warnedMissingSecret = false;
let warnedMissingPublishable = false;

/**
 * Logs (once per process) which Stripe env vars are missing. Never logs the
 * actual values. Safe to call from any server-side code path.
 */
export function warnIfStripeEnvMissing(context: string): void {
  if (!process.env.STRIPE_SECRET_KEY && !warnedMissingSecret) {
    warnedMissingSecret = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[stripe] STRIPE_SECRET_KEY is not set — server-side Stripe calls will fail (${context}).`,
    );
  }
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !warnedMissingPublishable) {
    warnedMissingPublishable = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set — the checkout page will show "Payment temporarily unavailable" (${context}).`,
    );
  }
}

export function getStripeServer(): Stripe {
  if (cached) return cached;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    warnIfStripeEnvMissing('getStripeServer');
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  cached = new Stripe(secret, {
    typescript: true,
  });
  return cached;
}

export async function createBookingPaymentIntent(
  input: CreateBookingPaymentIntentInput,
): Promise<CreateBookingPaymentIntentResult> {
  if (!Number.isInteger(input.amountPence) || input.amountPence <= 0) {
    throw new Error('amountPence must be a positive integer');
  }
  const stripe = getStripeServer();
  const intent = await stripe.paymentIntents.create({
    amount: input.amountPence,
    currency: input.currency,
    automatic_payment_methods: { enabled: true },
    description: input.description,
    metadata: {
      bookingId: input.metadata.bookingId,
      quoteId: input.metadata.quoteId,
      trackingId: input.metadata.trackingId,
      customerId: input.metadata.customerId,
      tyreId: input.metadata.tyreId,
      ...(input.metadata.jobType ? { jobType: input.metadata.jobType } : {}),
      ...(input.metadata.bookingAdjustmentId
        ? { bookingAdjustmentId: input.metadata.bookingAdjustmentId }
        : {}),
      ...(input.metadata.paymentKind ? { paymentKind: input.metadata.paymentKind } : {}),
    },
    ...(input.receiptEmail ? { receipt_email: input.receiptEmail } : {}),
  });
  if (!intent.client_secret) {
    throw new Error('Stripe did not return a client secret');
  }
  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    amountPence: intent.amount,
    currency: 'gbp',
  };
}
