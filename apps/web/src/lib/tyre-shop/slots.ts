/**
 * Slot generator for the Tyre Shop.
 *
 * Generates a deterministic 14-day grid of fitting slots starting from the
 * given anchor date. Closed on Sundays. Slots are 09:00, 11:00, 13:00, 15:00.
 * For backorder bookings the earliest available date is shifted by the
 * working-days ETA so the customer can never pick a slot before stock can
 * be sourced.
 */

const SLOT_TIMES: readonly string[] = ['09:00', '11:00', '13:00', '15:00'];
const DAYS = 14;

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

function shiftWorkingDays(from: Date, workingDays: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < workingDays) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0) added++; // count anything but Sunday as a working day
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
}

export function generateTyreShopSlots(input: GenerateSlotsInput = {}): TyreShopSlot[] {
  const now = input.from ?? new Date();
  const start =
    input.isBackorder && input.backorderEtaWorkingDays
      ? shiftWorkingDays(now, input.backorderEtaWorkingDays)
      : new Date(now);

  // Earliest bookable slot is tomorrow (no same-day for the public flow).
  if (!input.isBackorder) {
    start.setDate(start.getDate() + 1);
  }
  start.setHours(0, 0, 0, 0);

  const slots: TyreShopSlot[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d.getDay() === 0) continue; // Closed Sundays
    const dateStr = isoDate(d);
    for (const t of SLOT_TIMES) {
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
}): string | undefined {
  if (!input.isBackorder) return undefined;
  const d = shiftWorkingDays(input.from ?? new Date(), input.backorderEtaWorkingDays);
  return isoDate(d);
}
