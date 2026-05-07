/**
 * Customer-facing price explanation builder. UK English. NO VAT mention.
 * Reused by Quick Booking explain card, public quote summary, and payment links.
 */
import type { DynamicQuoteResult } from './types';

export interface PriceExplanationInput {
  quote: DynamicQuoteResult;
}

function fmt(gbp: string): string {
  const n = parseFloat(gbp);
  return Number.isFinite(n) ? `£${n.toFixed(2)}` : `£${gbp}`;
}

export function buildCustomerPriceExplanation(input: PriceExplanationInput): string {
  const { quote } = input;
  const { jobType, pricing } = quote;
  const lines: string[] = [];

  if (jobType === 'ASSESSMENT') {
    lines.push(
      `Emergency tyre assessment fee: ${fmt(pricing.basePriceGbp)}.`,
      'A qualified fitter will travel to you, inspect the tyre, and recommend repair or replacement on site.',
    );
  } else {
    lines.push(
      `Tyre + fitting: ${fmt(pricing.multipliedTyrePriceGbp)}.`,
      'Includes the tyre and on-site fitting by our mobile technician.',
    );
  }

  const distanceMiles = pricing.breakdown.distance.distanceMiles;
  if (distanceMiles != null && distanceMiles > pricing.breakdown.distance.freeMiles) {
    lines.push(`Travel from base: ${fmt(pricing.distanceFeeGbp)}.`);
  }

  const factors: string[] = [];
  if (pricing.breakdown.time.band === 'night') factors.push('late-night');
  if (pricing.breakdown.date.isWeekend) factors.push('weekend');
  if (pricing.breakdown.date.isBankHoliday) factors.push('bank holiday');
  if (pricing.breakdown.weather.severity === 'severe') factors.push('severe weather');
  if (pricing.breakdown.demand.openJobs != null && pricing.breakdown.demand.multiplier > 1) {
    factors.push('high demand');
  }
  if (factors.length > 0) {
    lines.push(`Emergency factors applied: ${factors.join(', ')}.`);
  }

  lines.push(`Total: ${fmt(pricing.totalPriceGbp)}.`);

  if (distanceMiles != null && distanceMiles >= 18) {
    lines.push(
      'Because of the distance, we may ask you to pay in full upfront so we can dispatch right away.',
    );
  }

  return lines.join('\n');
}
