/**
 * Build a useful WhatsApp deep-link with a prefilled message.
 *
 * Rules:
 *   - Never include payment, Stripe or auth data.
 *   - Vehicle reg / location are included only when the customer already
 *     entered them in the quote flow.
 *   - Output is properly URL-encoded for `https://wa.me/<n>?text=...`.
 */

import { siteConfig } from '@/lib/site-config';

export interface WhatsappContext {
  /** True if the customer already has meaningful saved progress. */
  hasSavedQuote?: boolean;
  /** Vehicle registration entered by the customer, if any. */
  vehicleRegistration?: string | null;
  /** Short summary of the location the customer entered, if any. */
  locationSummary?: string | null;
  /** Optional custom intro line — overrides the default. */
  intro?: string | null;
}

const DEFAULT_INTRO = 'Hi, I need emergency tyre help.';
const SAVED_INTRO = 'Hi, I started an emergency tyre quote. I need help now.';

export function buildWhatsappMessage(ctx: WhatsappContext = {}): string {
  const lines: string[] = [];
  if (ctx.intro && ctx.intro.trim().length > 0) {
    lines.push(ctx.intro.trim());
  } else {
    lines.push(ctx.hasSavedQuote ? SAVED_INTRO : DEFAULT_INTRO);
  }

  if (ctx.vehicleRegistration && ctx.vehicleRegistration.trim().length > 0) {
    lines.push(`My registration is: ${ctx.vehicleRegistration.trim().toUpperCase()}`);
  }
  if (ctx.locationSummary && ctx.locationSummary.trim().length > 0) {
    lines.push(`My location is: ${ctx.locationSummary.trim()}`);
  }
  return lines.join('\n');
}

export function buildWhatsappHref(ctx: WhatsappContext = {}): string {
  const base = siteConfig.whatsappHref;
  const message = buildWhatsappMessage(ctx);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}text=${encodeURIComponent(message)}`;
}
