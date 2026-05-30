import 'server-only';

import { db, schema, eq } from '@tyrerepair/db';
import { siteConfig } from '@/lib/site-config';

/**
 * Admin Efficiency Pack — Feature 3: Customer Message Templates.
 *
 * Safe, professional UK English templates. No fake ETAs, no scarcity.
 *
 * Defaults live in code so the app always boots with sane copy. Admin edits
 * are stored in `app_settings.key='message_templates.overrides'` as a JSON
 * map `{ <KEY>: { template: string } }` and merged on read with a short
 * in-process cache so render calls stay cheap.
 */

export type AdminMessageTemplateKey =
  | 'ON_OUR_WAY'
  | 'PAYMENT_REMINDER'
  | 'LOCATION_CONFIRMATION'
  | 'MISSING_LOCKING_NUT_KEY'
  | 'BALANCE_DUE'
  | 'NO_ANSWER_FOLLOW_UP'
  | 'ASSESSMENT_EXPLANATION'
  | 'TRACKING_LINK'
  | 'CALLBACK_REPLY';

export interface AdminMessageTemplateVariables {
  customerName?: string | null;
  trackingId?: string | null;
  paymentLink?: string | null;
  balanceLink?: string | null;
  trackingLink?: string | null;
  servicePhoneNumber?: string | null;
  whatsappNumber?: string | null;
  locationLabel?: string | null;
  balanceDueGbp?: string | null;
}

export interface AdminMessageTemplate {
  key: AdminMessageTemplateKey;
  label: string;
  description: string;
  variables: ReadonlyArray<keyof AdminMessageTemplateVariables>;
  template: string;
}

const TEMPLATES: ReadonlyArray<AdminMessageTemplate> = [
  {
    key: 'ON_OUR_WAY',
    label: 'On our way',
    description: 'Send when the technician has been dispatched.',
    variables: ['customerName', 'trackingLink', 'servicePhoneNumber'],
    template:
      'Hi {customerName}, your TyreRepair UK technician is now on the way. You can follow the job here: {trackingLink}. Reply or call {servicePhoneNumber} if anything changes.',
  },
  {
    key: 'PAYMENT_REMINDER',
    label: 'Payment reminder',
    description: 'Send when a booking is unpaid and we need to confirm payment.',
    variables: ['customerName', 'paymentLink', 'servicePhoneNumber'],
    template:
      'Hi {customerName}, we have your booking on hold. To confirm it please complete payment here: {paymentLink}. Any questions, call {servicePhoneNumber}.',
  },
  {
    key: 'LOCATION_CONFIRMATION',
    label: 'Location confirmation',
    description: 'Ask the customer to share or confirm their location.',
    variables: ['customerName', 'trackingLink', 'servicePhoneNumber'],
    template:
      'Hi {customerName}, please share or confirm your exact location so we can find you quickly: {trackingLink}. Thanks — TyreRepair UK ({servicePhoneNumber}).',
  },
  {
    key: 'MISSING_LOCKING_NUT_KEY',
    label: 'Missing locking wheel nut key',
    description: 'Customer has no locking wheel nut key — confirm before dispatch.',
    variables: ['customerName', 'servicePhoneNumber'],
    template:
      'Hi {customerName}, you mentioned you do not have a locking wheel nut key. Please reply or call {servicePhoneNumber} so we can advise on the safest next step before we travel out.',
  },
  {
    key: 'BALANCE_DUE',
    label: 'Balance due',
    description: 'Deposit was paid — request balance.',
    variables: ['customerName', 'balanceLink', 'balanceDueGbp', 'servicePhoneNumber'],
    template:
      'Hi {customerName}, the remaining balance of £{balanceDueGbp} can be paid here: {balanceLink}. Call {servicePhoneNumber} if you need help.',
  },
  {
    key: 'NO_ANSWER_FOLLOW_UP',
    label: 'No answer follow-up',
    description: 'Send after a no-answer call.',
    variables: ['servicePhoneNumber'],
    template:
      'Hi, this is TyreRepair UK. We tried calling about your tyre request. Please call us back on {servicePhoneNumber} or reply here when you are free.',
  },
  {
    key: 'ASSESSMENT_EXPLANATION',
    label: 'Assessment explanation',
    description: 'Explain how the assessment fee works.',
    variables: ['customerName', 'servicePhoneNumber'],
    template:
      'Hi {customerName}, your booking is for an on-site tyre assessment. Once our technician sees the tyre we will confirm whether a repair is possible or a replacement is needed and quote the difference clearly. Any questions: {servicePhoneNumber}.',
  },
  {
    key: 'TRACKING_LINK',
    label: 'Tracking link',
    description: 'Send the customer-facing tracking link.',
    variables: ['customerName', 'trackingLink'],
    template:
      'Hi {customerName}, here is your tracking link: {trackingLink}. You will see live status updates here.',
  },
  {
    key: 'CALLBACK_REPLY',
    label: 'Callback reply',
    description: 'Reply to a callback request.',
    variables: ['customerName', 'servicePhoneNumber'],
    template:
      'Hi {customerName}, this is TyreRepair UK returning your callback request. Please call us on {servicePhoneNumber} or reply here so we can help.',
  },
];

export function listAdminMessageTemplateDefaults(): ReadonlyArray<AdminMessageTemplate> {
  return TEMPLATES;
}

export const MESSAGE_TEMPLATE_OVERRIDES_KEY = 'message_templates.overrides';

interface TemplateOverride {
  template?: string;
}
type OverridesMap = Partial<Record<AdminMessageTemplateKey, TemplateOverride>>;

let overridesCache: { map: OverridesMap; loadedAt: number } | null = null;
const OVERRIDES_TTL_MS = 30_000;

async function loadOverrides(): Promise<OverridesMap> {
  const now = Date.now();
  if (overridesCache && now - overridesCache.loadedAt < OVERRIDES_TTL_MS) {
    return overridesCache.map;
  }
  try {
    const rows = await db
      .select({ value: schema.appSettings.value })
      .from(schema.appSettings)
      .where(eq(schema.appSettings.key, MESSAGE_TEMPLATE_OVERRIDES_KEY))
      .limit(1);
    const stored = (rows[0]?.value as OverridesMap | undefined) ?? {};
    overridesCache = { map: stored, loadedAt: now };
    return stored;
  } catch {
    overridesCache = { map: {}, loadedAt: now };
    return {};
  }
}

export function clearMessageTemplateOverridesCache(): void {
  overridesCache = null;
}

function mergeOne(
  base: AdminMessageTemplate,
  overrides: OverridesMap,
): AdminMessageTemplate {
  const ov = overrides[base.key];
  if (!ov || typeof ov.template !== 'string' || ov.template.trim().length === 0) {
    return base;
  }
  return { ...base, template: ov.template };
}

export async function listAdminMessageTemplates(): Promise<ReadonlyArray<AdminMessageTemplate>> {
  const overrides = await loadOverrides();
  return TEMPLATES.map((t) => mergeOne(t, overrides));
}

export async function getAdminMessageTemplate(
  key: AdminMessageTemplateKey,
): Promise<AdminMessageTemplate | null> {
  const base = TEMPLATES.find((t) => t.key === key) ?? null;
  if (!base) return null;
  const overrides = await loadOverrides();
  return mergeOne(base, overrides);
}

export async function renderAdminMessageTemplate(
  key: AdminMessageTemplateKey,
  vars: AdminMessageTemplateVariables,
): Promise<string | null> {
  const t = await getAdminMessageTemplate(key);
  if (!t) return null;
  const merged: AdminMessageTemplateVariables = {
    servicePhoneNumber: siteConfig.phoneDisplay,
    whatsappNumber: siteConfig.whatsappDisplay,
    customerName: 'there',
    ...vars,
  };
  return t.template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = merged[name as keyof AdminMessageTemplateVariables];
    if (v == null || v === '') return '';
    return String(v);
  });
}
