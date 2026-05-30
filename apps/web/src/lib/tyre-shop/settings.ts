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
  /** HH:MM slot times offered to customers, in order. */
  slotTimes: string[];
  /** How many days ahead the booking grid extends. */
  bookingWindowDays: number;
  /** When true, Sunday slots are included in the grid. */
  sundaysOpen: boolean;
}

const DEFAULTS: TyreShopFees = {
  fittingFeeGarageGbp: 25,
  fittingFeeHomeGbp: 45,
  backorderEtaWorkingDays: 3,
  freeDistanceMiles: 5,
  perMileGbp: 1.2,
  maxHomeFittingMiles: 40,
  slotTimes: ['09:00', '11:00', '13:00', '15:00'],
  bookingWindowDays: 14,
  sundaysOpen: false,
};

const SETTING_KEYS = [
  'tyre_shop.fitting_fee_garage_gbp',
  'tyre_shop.fitting_fee_home_gbp',
  'tyre_shop.backorder_eta_working_days',
  'tyre_shop.free_distance_miles',
  'tyre_shop.per_mile_gbp',
  'tyre_shop.max_home_fitting_miles',
  'tyre_shop.slot_times',
  'tyre_shop.booking_window_days',
  'tyre_shop.sundays_open',
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

function toBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
  }
  if (typeof value === 'number') return value !== 0;
  if (value && typeof value === 'object' && 'value' in value) {
    return toBool((value as { value: unknown }).value, fallback);
  }
  return fallback;
}

function toSlotTimes(value: unknown, fallback: string[]): string[] {
  const rx = /^([01]\d|2[0-3]):[0-5]\d$/;
  const norm = (raw: unknown): string[] | null => {
    let arr: unknown[] | null = null;
    if (Array.isArray(raw)) arr = raw;
    else if (typeof raw === 'string') arr = raw.split(',');
    if (!arr) return null;
    const cleaned = arr
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => rx.test(s));
    return cleaned.length > 0 ? Array.from(new Set(cleaned)).sort() : null;
  };
  if (value && typeof value === 'object' && 'value' in value && !Array.isArray(value)) {
    return toSlotTimes((value as { value: unknown }).value, fallback);
  }
  return norm(value) ?? fallback;
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
      slotTimes: toSlotTimes(map.get('tyre_shop.slot_times'), DEFAULTS.slotTimes),
      bookingWindowDays: Math.max(
        1,
        Math.min(
          60,
          Math.round(
            toNumber(
              map.get('tyre_shop.booking_window_days'),
              DEFAULTS.bookingWindowDays,
            ),
          ),
        ),
      ),
      sundaysOpen: toBool(map.get('tyre_shop.sundays_open'), DEFAULTS.sundaysOpen),
    };
  } catch {
    return { ...DEFAULTS };
  }
}
