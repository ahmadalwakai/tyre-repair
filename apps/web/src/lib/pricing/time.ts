import type { PricingRuleMap, TimePricingFactor } from './types';
import { getPricingRuleNumber } from './rules';

const LONDON_TZ = 'Europe/London';

function getLondonHour(date: Date): number {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TZ,
    hour: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const hourPart = parts.find((p) => p.type === 'hour');
  const hour = hourPart ? Number.parseInt(hourPart.value, 10) : date.getUTCHours();
  return Number.isFinite(hour) ? hour % 24 : 0;
}

export interface TimeBandHours {
  /** Inclusive hour 0–23 when peak morning band starts. */
  peakStart: number;
  /** Exclusive hour 0–23 when peak morning band ends. */
  peakEnd: number;
  /** Inclusive hour 0–23 when night band starts. */
  nightStart: number;
  /** Exclusive hour 0–23 when night band ends. Wraps past midnight. */
  nightEnd: number;
}

const DEFAULT_HOURS: TimeBandHours = {
  peakStart: 7,
  peakEnd: 9,
  nightStart: 22,
  nightEnd: 6,
};

function inBand(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function calculateTimeFactor(
  rules: PricingRuleMap,
  now: Date = new Date(),
  hours: TimeBandHours = DEFAULT_HOURS,
): TimePricingFactor {
  const hour = getLondonHour(now);
  const nightMul = getPricingRuleNumber(rules, 'time_night', 1.35);
  const peakMul = getPricingRuleNumber(rules, 'time_peak_morning', 1.15);

  const isNight = inBand(hour, hours.nightStart, hours.nightEnd);
  const isPeak = inBand(hour, hours.peakStart, hours.peakEnd);

  const nightLabel = `${pad2(hours.nightStart)}:00–${pad2(hours.nightEnd)}:00`;
  const peakLabel = `${pad2(hours.peakStart)}:00–${pad2(hours.peakEnd)}:00`;

  if (isNight && isPeak) {
    const mul = Math.max(nightMul, peakMul);
    return {
      band: nightMul >= peakMul ? 'night' : 'peak_morning',
      hourLondon: hour,
      multiplier: mul,
      reason: `Overlapping bands — applied highest (${mul.toFixed(2)})`,
    };
  }
  if (isNight) {
    return {
      band: 'night',
      hourLondon: hour,
      multiplier: nightMul,
      reason: `Night-time emergency surge (${nightLabel})`,
    };
  }
  if (isPeak) {
    return {
      band: 'peak_morning',
      hourLondon: hour,
      multiplier: peakMul,
      reason: `Peak morning demand (${peakLabel})`,
    };
  }
  return {
    band: 'standard',
    hourLondon: hour,
    multiplier: 1,
    reason: 'Standard daytime hours',
  };
}
