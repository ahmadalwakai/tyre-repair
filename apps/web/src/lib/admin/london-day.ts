import 'server-only';

/**
 * Europe/London day-window helpers.
 * Used by the Today screen, Daily Close, and other date-bounded admin
 * endpoints so behaviour matches `cash-reconciliation`.
 */

export function londonOffsetMinutesForDate(
  year: number,
  month: number,
  day: number,
): number {
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    timeZoneName: 'shortOffset',
  });
  const parts = fmt.formatToParts(probe);
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-]\d+)?/u.exec(tz);
  if (!m || !m[1]) return 0;
  return parseInt(m[1], 10) * 60;
}

export function dayBoundsLondonUtc(dateStr: string): { fromUtc: Date; toUtc: Date } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(dateStr);
  if (!m) {
    const now = new Date();
    return { fromUtc: now, toUtc: now };
  }
  const y = parseInt(m[1] ?? '0', 10);
  const mo = parseInt(m[2] ?? '0', 10);
  const d = parseInt(m[3] ?? '0', 10);
  const offsetMin = londonOffsetMinutesForDate(y, mo, d);
  const fromUtc = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0) - offsetMin * 60 * 1000);
  const toUtc = new Date(fromUtc.getTime() + 24 * 60 * 60 * 1000);
  return { fromUtc, toUtc };
}

export function todayLondonDateString(): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const mo = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${mo}-${d}`;
}

export function toMoney(n: number): string {
  if (!Number.isFinite(n)) return '0.00';
  return (Math.round(n * 100) / 100).toFixed(2);
}
