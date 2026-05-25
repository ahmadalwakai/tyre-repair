/**
 * App-settings-backed configuration for the Tyre Shop flow.
 *
 * Reads optional `app_settings` rows; falls back to safe defaults so the
 * flow continues to work in fresh environments. Never throws — a settings
 * read failure must not break a customer's quote/order.
 */
import { db, schema, inArray } from '@tyrerepair/db';

export interface TyreShopFees {
  fittingFeeGarageGbp: number;
  fittingFeeHomeGbp: number;
  backorderEtaWorkingDays: number;
  /** Free-mile zone for HOME fitting distance fee. */
  freeDistanceMiles: number;
  /** Per-mile rate beyond the free zone for HOME fitting. */
  perMileGbp: number;
  /** Hard coverage cap for HOME fitting. Public is blocked beyond this. */
  maxHomeFittingMiles: number;
}

const DEFAULTS: TyreShopFees = {
  fittingFeeGarageGbp: 25,
  fittingFeeHomeGbp: 45,
  backorderEtaWorkingDays: 3,
  freeDistanceMiles: 5,
  perMileGbp: 1.2,
  maxHomeFittingMiles: 40,
};

const SETTING_KEYS = [
  'tyre_shop.fitting_fee_garage_gbp',
  'tyre_shop.fitting_fee_home_gbp',
  'tyre_shop.backorder_eta_working_days',
  'tyre_shop.free_distance_miles',
  'tyre_shop.per_mile_gbp',
  'tyre_shop.max_home_fitting_miles',
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

export async function getTyreShopFees(): Promise<TyreShopFees> {
  try {
    const rows = await db
      .select({ key: schema.appSettings.key, value: schema.appSettings.value })
      .from(schema.appSettings)
      .where(inArray(schema.appSettings.key, SETTING_KEYS as unknown as string[]));
    const map = new Map<string, unknown>();
    for (const r of rows) {
      map.set(r.key, r.value);
    }
    return {
      fittingFeeGarageGbp: toNumber(
        map.get('tyre_shop.fitting_fee_garage_gbp'),
        DEFAULTS.fittingFeeGarageGbp,
      ),
      fittingFeeHomeGbp: toNumber(
        map.get('tyre_shop.fitting_fee_home_gbp'),
        DEFAULTS.fittingFeeHomeGbp,
      ),
      backorderEtaWorkingDays: Math.max(
        1,
        Math.round(
          toNumber(
            map.get('tyre_shop.backorder_eta_working_days'),
            DEFAULTS.backorderEtaWorkingDays,
          ),
        ),
      ),
      freeDistanceMiles: toNumber(
        map.get('tyre_shop.free_distance_miles'),
        DEFAULTS.freeDistanceMiles,
      ),
      perMileGbp: toNumber(map.get('tyre_shop.per_mile_gbp'), DEFAULTS.perMileGbp),
      maxHomeFittingMiles: toNumber(
        map.get('tyre_shop.max_home_fitting_miles'),
        DEFAULTS.maxHomeFittingMiles,
      ),
    };
  } catch {
    return { ...DEFAULTS };
  }
}
