import { db, schema, and, eq, asc, isNull, or, gt, lte } from '@tyrerepair/db';
import type {
  OverrideAppliedItem,
  OverridePricingFactor,
} from './types';
import type { PricingOverrideStatus, PricingOverrideType } from '@tyrerepair/realtime';

export async function calculateOverrideFactor(
  now: Date = new Date(),
): Promise<OverridePricingFactor> {
  try {
    const rows = await db
      .select({
        id: schema.pricingOverrides.id,
        type: schema.pricingOverrides.type,
        status: schema.pricingOverrides.status,
        label: schema.pricingOverrides.label,
        multiplier: schema.pricingOverrides.multiplier,
        reason: schema.pricingOverrides.reason,
        startsAt: schema.pricingOverrides.startsAt,
        expiresAt: schema.pricingOverrides.expiresAt,
        createdAt: schema.pricingOverrides.createdAt,
      })
      .from(schema.pricingOverrides)
      .where(
        and(
          eq(schema.pricingOverrides.status, 'active'),
          lte(schema.pricingOverrides.startsAt, now),
          or(
            isNull(schema.pricingOverrides.expiresAt),
            gt(schema.pricingOverrides.expiresAt, now),
          ),
        ),
      )
      .orderBy(asc(schema.pricingOverrides.createdAt));

    let multiplier = 1;
    const items: OverrideAppliedItem[] = [];
    for (const r of rows) {
      const m = Number(r.multiplier);
      if (!Number.isFinite(m) || m <= 0) continue;
      multiplier *= m;
      items.push({
        overrideId: r.id,
        type: r.type as PricingOverrideType,
        status: r.status as PricingOverrideStatus,
        label: r.label,
        multiplier: m,
        reason: r.reason,
      });
    }

    return {
      activeOverrides: items,
      multiplier,
      reason:
        items.length === 0
          ? 'No active admin overrides'
          : `${items.length} active admin override${items.length === 1 ? '' : 's'} applied`,
    };
  } catch {
    return {
      activeOverrides: [],
      multiplier: 1,
      reason: 'Admin overrides unavailable',
    };
  }
}
