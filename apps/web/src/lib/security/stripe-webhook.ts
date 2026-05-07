import Stripe from 'stripe';
import { getStripeServer } from '@/lib/payments/stripe';

export interface VerifiedStripeEventResult {
  event: Stripe.Event;
}

export class StripeWebhookSignatureError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'StripeWebhookSignatureError';
  }
}

/**
 * Verify a raw Stripe webhook payload using the configured webhook secret.
 * Throws StripeWebhookSignatureError on any verification failure.
 */
export function verifyStripeWebhook(rawBody: string, signature: string | null): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new StripeWebhookSignatureError('STRIPE_WEBHOOK_SECRET is not configured');
  }
  if (!signature) {
    throw new StripeWebhookSignatureError('Missing stripe-signature header');
  }
  const stripe = getStripeServer();
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new StripeWebhookSignatureError('Invalid Stripe signature');
  }
}
