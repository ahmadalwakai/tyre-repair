import Holidays from 'date-holidays';
import type { DatePricingFactor, PricingRuleMap } from './types';
import { getPricingRuleNumber } from './rules';

const LONDON_TZ = 'Europe/London';

interface HolidayCheck {
  isHoliday: boolean;
  name: string | null;
}

function getLondonDateParts(date: Date): { year: number; month: number; day: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(date);
  const year = Number.parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
  const month = Number.parseInt(parts.find((p) => p.type === 'month')?.value ?? '0', 10);
  const day = Number.parseInt(parts.find((p) => p.type === 'day')?.value ?? '0', 10);
  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { year, month, day, weekday: weekdayMap[weekdayStr] ?? 1 };
}

function checkBankHoliday(year: number, month: number, day: number): HolidayCheck {
  const local = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const sources: Array<() => Holidays> = [
    () => new Holidays('GB', 'SCT'),
    () => new Holidays('GB'),
  ];
  for (const make of sources) {
    try {
      const hd = make();
      const result = hd.isHoliday(local);
      if (result && Array.isArray(result) && result.length > 0) {
        const first = result[0];
        if (first && (first.type === 'public' || first.type === 'bank')) {
          return { isHoliday: true, name: first.name };
        }
      }
    } catch {
      // try next source
    }
  }
  return { isHoliday: false, name: null };
}

export function calculateDateFactor(
  rules: PricingRuleMap,
  now: Date = new Date(),
): DatePricingFactor {
  const { year, month, day, weekday } = getLondonDateParts(now);
  const isWeekend = weekday === 0 || weekday === 6;
  const holiday = checkBankHoliday(year, month, day);

  const weekendMul = getPricingRuleNumber(rules, 'date_weekend', 1.1);
  const holidayMul = getPricingRuleNumber(rules, 'date_bank_holiday', 1.15);

  let multiplier = 1;
  const reasons: string[] = [];
  if (isWeekend) {
    multiplier *= weekendMul;
    reasons.push(`Weekend (${weekendMul.toFixed(2)})`);
  }
  if (holiday.isHoliday) {
    multiplier *= holidayMul;
    reasons.push(`UK bank holiday: ${holiday.name ?? 'Bank holiday'} (${holidayMul.toFixed(2)})`);
  }
  if (reasons.length === 0) reasons.push('Standard weekday');

  return {
    isWeekend,
    isBankHoliday: holiday.isHoliday,
    bankHolidayName: holiday.name,
    multiplier,
    reason: reasons.join(' · '),
  };
}
