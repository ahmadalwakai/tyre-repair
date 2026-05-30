/**
 * App-settings-backed pricing extras.
 *
 * Reads optional `app_settings` rows; falls back to safe defaults so the
 * pricing engine continues to work in fresh environments. Never throws —
 * a settings read failure must not break a customer's quote.
 */
import { db, schema, inArray } from '@tyrerepair/db';

export interface PricingExtras {
  /** How long a generated quote stays valid before the customer must re-quote. */
  quoteExpiryMinutes: number;
  /** Minimum deposit floor (£) to prevent uneconomic micro-deposits. */
  minimumDepositGbp: number;
  /** Peak morning band start hour (London, 0–23, inclusive). */
  peakMorningStartHour: number;
  /** Peak morning band end hour (London, 0–23, exclusive). */
  peakMorningEndHour: number;
  /** Night band start hour (London, 0–23, inclusive). */
  nightStartHour: number;
  /** Night band end hour (London, 0–23, exclusive). Wraps past midnight. */
  nightEndHour: number;
  /** Minimum total a customer can be charged for any quote (callout floor). */
  minimumQuoteTotalGbp: number;
  /** Flat callout / labour fee added on top of tyre price and distance. */
  calloutBaseFeeGbp: number;
}

const DEFAULTS: PricingExtras = {
  quoteExpiryMinutes: 30,
  minimumDepositGbp: 10,
  peakMorningStartHour: 7,
  peakMorningEndHour: 9,
  nightStartHour: 22,
  nightEndHour: 6,
  minimumQuoteTotalGbp: 150,
  calloutBaseFeeGbp: 95,
};

const SETTING_KEYS = [
  'pricing.quote_expiry_minutes',
  'pricing.minimum_deposit_gbp',
  'pricing.peak_morning_start_hour',
  'pricing.peak_morning_end_hour',
  'pricing.night_start_hour',
  'pricing.night_end_hour',
  'pricing.minimum_quote_total_gbp',
  'pricing.callout_base_fee_gbp',
] as const;

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  if (value && typeof value === 'object' && 'value' in value) {
    return toNumber((value as { value: unknown }).value, fallback);
  }
  return fallback;
}

function clampHour(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const h = Math.floor(n);
  if (h < 0) return 0;
  if (h > 23) return 23;
  return h;
}

export async function getPricingExtras(): Promise<PricingExtras> {
  try {
    const rows = await db
      .select({ key: schema.appSettings.key, value: schema.appSettings.value })
      .from(schema.appSettings)
      .where(inArray(schema.appSettings.key, SETTING_KEYS as unknown as string[]));
    const map = new Map<string, unknown>();
    for (const r of rows) map.set(r.key, r.value);
    return {
      quoteExpiryMinutes: Math.max(
        1,
        Math.min(
          24 * 60,
          Math.round(
            toNumber(map.get('pricing.quote_expiry_minutes'), DEFAULTS.quoteExpiryMinutes),
          ),
        ),
      ),
      minimumDepositGbp: Math.max(
        0,
        Math.min(
          1000,
          toNumber(map.get('pricing.minimum_deposit_gbp'), DEFAULTS.minimumDepositGbp),
        ),
      ),
      peakMorningStartHour: clampHour(
        toNumber(map.get('pricing.peak_morning_start_hour'), DEFAULTS.peakMorningStartHour),
      ),
      peakMorningEndHour: clampHour(
        toNumber(map.get('pricing.peak_morning_end_hour'), DEFAULTS.peakMorningEndHour),
      ),
      nightStartHour: clampHour(
        toNumber(map.get('pricing.night_start_hour'), DEFAULTS.nightStartHour),
      ),
      nightEndHour: clampHour(
        toNumber(map.get('pricing.night_end_hour'), DEFAULTS.nightEndHour),
      ),
      minimumQuoteTotalGbp: Math.max(
        0,
        Math.min(
          10_000,
          toNumber(
            map.get('pricing.minimum_quote_total_gbp'),
            DEFAULTS.minimumQuoteTotalGbp,
          ),
        ),
      ),
      calloutBaseFeeGbp: Math.max(
        0,
        Math.min(
          10_000,
          toNumber(
            map.get('pricing.callout_base_fee_gbp'),
            DEFAULTS.calloutBaseFeeGbp,
          ),
        ),
      ),
    };
  } catch {
    return { ...DEFAULTS };
  }
}
