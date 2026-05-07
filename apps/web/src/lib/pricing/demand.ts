import { db, schema, sql, inArray } from '@tyrerepair/db';
import type { DemandPricingFactor, PricingRuleMap } from './types';
import { getPricingRuleNumber } from './rules';

const OPEN_STATUSES = [
  'confirmed',
  'dispatching',
  'dispatched',
  'on_site',
] as const satisfies ReadonlyArray<
  'confirmed' | 'dispatching' | 'dispatched' | 'on_site'
>;

export async function calculateDemandFactor(
  rules: PricingRuleMap,
): Promise<DemandPricingFactor> {
  const threshold = Math.round(getPricingRuleNumber(rules, 'demand_open_jobs_threshold', 10));
  const highMul = getPricingRuleNumber(rules, 'demand_high_multiplier', 1.2);

  try {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(inArray(schema.bookings.status, [...OPEN_STATUSES]));
    const openJobs = Number(rows[0]?.count ?? 0);
    if (openJobs > threshold) {
      return {
        openJobs,
        threshold,
        multiplier: highMul,
        reason: `${openJobs} open jobs above threshold ${threshold}`,
      };
    }
    return {
      openJobs,
      threshold,
      multiplier: 1,
      reason: `${openJobs} open jobs within capacity`,
    };
  } catch {
    return {
      openJobs: null,
      threshold,
      multiplier: 1,
      reason: 'Demand unavailable',
    };
  }
}
