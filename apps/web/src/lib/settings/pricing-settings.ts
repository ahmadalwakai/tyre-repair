/**
 * Pricing thresholds reader (Cmd 3).
 *
 * Single source of truth for the numeric thresholds the profit-guard uses.
 * Stored under app_settings.key = 'pricing' as a JSONB document; partial
 * documents are merged over compiled-in defaults so a missing field never
 * blocks pricing.
 *
 * Resilience contract:
 *   - In-process cache keyed by 'pricing', TTL 60 seconds.
 *   - On any failure (DB down, parse error, validation error) we LOG a
 *     warning and return defaults. We never throw — quotes must keep
 *     flowing even when settings are unreachable.
 */
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';

export interface PricingThresholds {
  normal_distance_miles: number;
  review_distance_miles: number;
  high_risk_distance_miles: number;
  max_auto_quote_distance_miles: number;
  long_distance_assessment_threshold_miles: number;
  very_long_distance_assessment_threshold_miles: number;
  long_distance_assessment_min_gbp: number;
}

/**
 * Compiled-in defaults. These MUST match the historical constants that
 * lived in profit-guard.ts so behaviour is unchanged when no row exists.
 */
export const PRICING_THRESHOLD_DEFAULTS: PricingThresholds = {
  normal_distance_miles: 10,
  review_distance_miles: 10,
  high_risk_distance_miles: 25,
  max_auto_quote_distance_miles: 40,
  long_distance_assessment_threshold_miles: 18,
  very_long_distance_assessment_threshold_miles: 30,
  long_distance_assessment_min_gbp: 89,
} as const;

const SETTINGS_KEY = 'pricing';
const CACHE_TTL_MS = 60_000;

const pricingThresholdsSchema = z
  .object({
    normal_distance_miles: z.number().nonnegative().optional(),
    review_distance_miles: z.number().nonnegative().optional(),
    high_risk_distance_miles: z.number().nonnegative().optional(),
    max_auto_quote_distance_miles: z.number().nonnegative().optional(),
    long_distance_assessment_threshold_miles: z.number().nonnegative().optional(),
    very_long_distance_assessment_threshold_miles: z.number().nonnegative().optional(),
    long_distance_assessment_min_gbp: z.number().nonnegative().optional(),
  })
  .passthrough();

interface CacheEntry {
  expiresAt: number;
  value: PricingThresholds;
}

let cache: CacheEntry | null = null;

function mergeWithDefaults(partial: Partial<PricingThresholds>): PricingThresholds {
  return { ...PRICING_THRESHOLD_DEFAULTS, ...partial };
}

/**
 * Returns the effective pricing thresholds, merging the JSONB value at
 * app_settings.key='pricing' over compiled-in defaults.
 *
 * Cached for {@link CACHE_TTL_MS} ms. Never throws.
 */
export async function getPricingThresholds(): Promise<PricingThresholds> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  let resolved: PricingThresholds = PRICING_THRESHOLD_DEFAULTS;
  try {
    const rows = await db
      .select({ value: schema.appSettings.value })
      .from(schema.appSettings)
      .where(eq(schema.appSettings.key, SETTINGS_KEY))
      .limit(1);
    const row = rows[0];
    if (row && row.value !== null && typeof row.value === 'object') {
      const parsed = pricingThresholdsSchema.safeParse(row.value);
      if (parsed.success) {
        const filtered: Partial<PricingThresholds> = {};
        for (const [k, v] of Object.entries(parsed.data)) {
          if (typeof v === 'number' && k in PRICING_THRESHOLD_DEFAULTS) {
            (filtered as Record<string, number>)[k] = v;
          }
        }
        resolved = mergeWithDefaults(filtered);
      } else {
        // eslint-disable-next-line no-console
        console.warn('[pricing-settings] invalid app_settings.pricing — using defaults');
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pricing-settings] read failed, using defaults', err);
    resolved = PRICING_THRESHOLD_DEFAULTS;
  }

  cache = { expiresAt: now + CACHE_TTL_MS, value: resolved };
  return resolved;
}

/** Clear the in-process cache (call after a settings update). */
export function invalidatePricingThresholds(): void {
  cache = null;
}
