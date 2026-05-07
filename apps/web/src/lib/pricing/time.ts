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

export function calculateTimeFactor(
  rules: PricingRuleMap,
  now: Date = new Date(),
): TimePricingFactor {
  const hour = getLondonHour(now);
  const nightMul = getPricingRuleNumber(rules, 'time_night', 1.35);
  const peakMul = getPricingRuleNumber(rules, 'time_peak_morning', 1.15);

  const isNight = hour >= 22 || hour < 6;
  const isPeak = hour >= 7 && hour < 9;

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
      reason: 'Night-time emergency surge (22:00–06:00)',
    };
  }
  if (isPeak) {
    return {
      band: 'peak_morning',
      hourLondon: hour,
      multiplier: peakMul,
      reason: 'Peak morning demand (07:00–09:00)',
    };
  }
  return {
    band: 'standard',
    hourLondon: hour,
    multiplier: 1,
    reason: 'Standard daytime hours',
  };
}
