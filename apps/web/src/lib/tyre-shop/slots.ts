/**
 * Slot generator for the Tyre Shop.
 *
 * Generates a deterministic booking grid from the given anchor date. Slot
 * times, window length and Sunday-open flag come from admin-editable
 * `tyre_shop.*` settings (see `lib/tyre-shop/settings.ts`) with safe
 * fallbacks if no config is loaded.
 */

const DEFAULT_SLOT_TIMES: readonly string[] = ['09:00', '11:00', '13:00', '15:00'];
const DEFAULT_DAYS = 14;

export interface TyreShopSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  label: string; // e.g. "Wed 8 May, 09:00"
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftWorkingDays(from: Date, workingDays: number, sundaysOpen: boolean): Date {
  const d = new Date(from);
  let added = 0;
  while (added < workingDays) {
    d.setDate(d.getDate() + 1);
    if (sundaysOpen || d.getDay() !== 0) added++;
  }
  return d;
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export interface GenerateSlotsInput {
  /** Now — defaults to current time. */
  from?: Date;
  /** If true, push earliest available date by `backorderEtaWorkingDays`. */
  isBackorder?: boolean;
  backorderEtaWorkingDays?: number;
  /** Override the default slot times (HH:MM). Falls back to defaults if empty. */
  slotTimes?: readonly string[];
  /** Override the default 14-day booking window. */
  windowDays?: number;
  /** When true, include Sundays in the booking grid. */
  sundaysOpen?: boolean;
}

export function generateTyreShopSlots(input: GenerateSlotsInput = {}): TyreShopSlot[] {
  const now = input.from ?? new Date();
  const slotTimes =
    input.slotTimes && input.slotTimes.length > 0 ? input.slotTimes : DEFAULT_SLOT_TIMES;
  const windowDays =
    typeof input.windowDays === 'number' && input.windowDays > 0
      ? Math.min(60, Math.floor(input.windowDays))
      : DEFAULT_DAYS;
  const sundaysOpen = input.sundaysOpen === true;

  const start =
    input.isBackorder && input.backorderEtaWorkingDays
      ? shiftWorkingDays(now, input.backorderEtaWorkingDays, sundaysOpen)
      : new Date(now);

  // Earliest bookable slot is tomorrow (no same-day for the public flow).
  if (!input.isBackorder) {
    start.setDate(start.getDate() + 1);
  }
  start.setHours(0, 0, 0, 0);

  const slots: TyreShopSlot[] = [];
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (!sundaysOpen && d.getDay() === 0) continue;
    const dateStr = isoDate(d);
    for (const t of slotTimes) {
      slots.push({
        date: dateStr,
        time: t,
        label: `${dayLabel(d)}, ${t}`,
      });
    }
  }
  return slots;
}

export function expectedReadyDateLabel(input: {
  isBackorder: boolean;
  backorderEtaWorkingDays: number;
  from?: Date;
  sundaysOpen?: boolean;
}): string | undefined {
  if (!input.isBackorder) return undefined;
  const d = shiftWorkingDays(
    input.from ?? new Date(),
    input.backorderEtaWorkingDays,
    input.sundaysOpen === true,
  );
  return isoDate(d);
}
