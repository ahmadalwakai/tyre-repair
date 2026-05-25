/**
 * Build pre-filled WhatsApp Quick Help options for the mobile bottom sheet.
 *
 * Rules:
 *   - Never include payment, Stripe, auth, admin or internal note data.
 *   - Vehicle reg / location are included only when the customer already
 *     entered them in the quote flow.
 *   - Output is properly URL-encoded for `https://wa.me/<n>?text=...`.
 *   - UK English ("tyre"). No fake ETA, no guaranteed reply time.
 */

import { siteConfig } from '@/lib/site-config';

export type WhatsAppPage = 'home' | 'quote' | 'checkout' | 'tracking' | 'other';

export type WhatsAppOptionId =
  | 'emergency'
  | 'send-location'
  | 'no-tyre-size'
  | 'continue-quote';

export interface WhatsAppContext {
  page: WhatsAppPage;
  /** Tracking id from `/track/[trackingId]`, when present. */
  trackingId?: string | null;
  /** True when meaningful saved quote progress exists. */
  hasSavedQuote?: boolean;
  /** Vehicle registration captured by the quote flow, if any. */
  vehicleRegistration?: string | null;
  /** Short human summary of the captured location, if any. */
  locationSummary?: string | null;
  /** Short human summary of the tyre problem / job type, if any. */
  problemSummary?: string | null;
}

export interface WhatsAppOption {
  id: WhatsAppOptionId;
  title: string;
  /** One-line preview shown under the title in the sheet. */
  preview: string;
  /** Full pre-filled message body sent to WhatsApp. */
  message: string;
}

const EMERGENCY_DEFAULT = 'Hi, I need emergency tyre help.';

function clean(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function truncate(value: string, max = 140): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function emergencyMessage(ctx: WhatsAppContext): string {
  if (ctx.page === 'tracking' && clean(ctx.trackingId)) {
    return `Hi, I’m checking my TyreRepair UK booking ${clean(ctx.trackingId)}.`;
  }
  if (ctx.page === 'checkout') {
    return 'Hi, I need help with my emergency tyre payment.';
  }
  if (ctx.page === 'quote') {
    return 'Hi, I’m completing an emergency tyre quote and need help.';
  }
  return EMERGENCY_DEFAULT;
}

function emergencyTitle(ctx: WhatsAppContext): string {
  if (ctx.page === 'tracking' && clean(ctx.trackingId)) return 'Booking help';
  if (ctx.page === 'checkout') return 'Payment help';
  if (ctx.page === 'quote') return 'Quote help';
  return 'Emergency tyre help';
}

function emergencyPreview(ctx: WhatsAppContext): string {
  if (ctx.page === 'tracking' && clean(ctx.trackingId)) {
    return `About booking ${clean(ctx.trackingId)}`;
  }
  if (ctx.page === 'checkout') return 'I need help paying';
  if (ctx.page === 'quote') return 'I need help finishing my quote';
  return 'Tell us you need urgent help';
}

function sendLocationOption(ctx: WhatsAppContext): WhatsAppOption {
  const loc = clean(ctx.locationSummary);
  if (loc) {
    return {
      id: 'send-location',
      title: 'Send my location',
      preview: truncate(loc, 60),
      message: `Hi, I need emergency tyre help. My location is: ${truncate(loc, 200)}.`,
    };
  }
  return {
    id: 'send-location',
    title: 'Send my location',
    preview: 'Share where you are now',
    message: 'Hi, I need emergency tyre help. I can send my location.',
  };
}

function noTyreSizeOption(): WhatsAppOption {
  return {
    id: 'no-tyre-size',
    title: 'I don’t know my tyre size',
    preview: 'We can help you find it',
    message: 'Hi, I need tyre help but I don’t know my tyre size.',
  };
}

function continueQuoteOption(ctx: WhatsAppContext): WhatsAppOption {
  if (!ctx.hasSavedQuote) {
    return {
      id: 'continue-quote',
      title: 'Get an emergency quote',
      preview: 'Start an emergency tyre quote',
      message: 'Hi, I need help getting an emergency tyre quote.',
    };
  }

  const lines = ['Hi, I started an emergency tyre quote and need help finishing it.'];
  const reg = clean(ctx.vehicleRegistration);
  if (reg) lines.push(`Vehicle registration: ${reg.toUpperCase()}`);
  const problem = clean(ctx.problemSummary);
  if (problem) lines.push(`Problem: ${truncate(problem, 120)}`);
  const loc = clean(ctx.locationSummary);
  if (loc) lines.push(`Location: ${truncate(loc, 200)}`);

  const previewParts: string[] = [];
  if (reg) previewParts.push(reg.toUpperCase());
  if (problem) previewParts.push(problem);
  if (!previewParts.length && loc) previewParts.push(loc);
  const preview = previewParts.length
    ? truncate(previewParts.join(' · '), 60)
    : 'Pick up where you left off';

  return {
    id: 'continue-quote',
    title: 'Continue my quote',
    preview,
    message: lines.join('\n'),
  };
}

export function buildWhatsAppOptions(ctx: WhatsAppContext): WhatsAppOption[] {
  return [
    {
      id: 'emergency',
      title: emergencyTitle(ctx),
      preview: emergencyPreview(ctx),
      message: emergencyMessage(ctx),
    },
    sendLocationOption(ctx),
    noTyreSizeOption(),
    continueQuoteOption(ctx),
  ];
}

/**
 * Build a `https://wa.me/<n>?text=...` href for an arbitrary message.
 *
 * Falls back safely to `siteConfig.whatsappHref` if the message is empty.
 */
export function buildWhatsAppHref(message: string): string {
  const base = siteConfig.whatsappHref;
  const text = clean(message);
  if (!text) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}text=${encodeURIComponent(text)}`;
}

/** Default fallback href used when JavaScript is disabled / fails. */
export function defaultEmergencyHref(): string {
  return buildWhatsAppHref(EMERGENCY_DEFAULT);
}
