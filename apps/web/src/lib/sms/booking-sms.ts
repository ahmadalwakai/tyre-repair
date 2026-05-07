/**
 * Booking SMS templates + send helpers (Voodoo SMS).
 *
 * Each helper is wrapped in try/catch by the caller — never let SMS failure
 * break a webhook or admin action.
 */

import { sendSms, type SendSmsResult } from './voodoo';
import { siteConfig } from '@/lib/site-config';

interface BookingConfirmationSmsInput {
  to: string;
  customerName: string | null;
  trackingId: string;
  totalPaidGbp: string;
  paymentMode: 'FULL' | 'DEPOSIT';
  balanceDueGbp: string | null;
}

function trackingUrl(trackingId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl;
  return `${base.replace(/\/$/, '')}/track/${trackingId}`;
}

export async function sendBookingConfirmationSms(
  input: BookingConfirmationSmsInput,
): Promise<SendSmsResult> {
  const greeting = input.customerName ? `Hi ${input.customerName.split(' ')[0]}, ` : 'Hi, ';
  const paid = `£${input.totalPaidGbp}`;
  const linePayment =
    input.paymentMode === 'DEPOSIT' && input.balanceDueGbp
      ? `Deposit ${paid} received (balance £${input.balanceDueGbp} on completion).`
      : `Payment ${paid} received.`;
  const message =
    `${greeting}your TyreRepair booking ${input.trackingId} is confirmed. ` +
    `${linePayment} Track: ${trackingUrl(input.trackingId)}. ` +
    `Reply CALL if you need us to phone you.`;
  return sendSms({ to: input.to, message });
}
