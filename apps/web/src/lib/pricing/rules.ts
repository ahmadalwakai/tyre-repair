import { db, schema, eq } from '@tyrerepair/db';
import type { PricingRuleKey, PricingRuleMap, PricingRuleRecord } from './types';

interface CacheEntry {
  rules: PricingRuleMap;
  loadedAt: number;
}

let cache: CacheEntry | null = null;
const SHORT_TTL_MS = 30_000;

export function clearPricingRulesCache(): void {
  cache = null;
}

export async function getPricingRules(): Promise<PricingRuleMap> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < SHORT_TTL_MS) {
    return cache.rules;
  }
  const rows = await db
    .select({
      key: schema.pricingRules.key,
      label: schema.pricingRules.label,
      numericValue: schema.pricingRules.numericValue,
      isMultiplier: schema.pricingRules.isMultiplier,
      isActive: schema.pricingRules.isActive,
    })
    .from(schema.pricingRules)
    .where(eq(schema.pricingRules.isActive, true));

  const map: PricingRuleMap = new Map();
  for (const row of rows) {
    const rec: PricingRuleRecord = {
      key: row.key as PricingRuleKey,
      label: row.label,
      numericValue: Number(row.numericValue),
      isMultiplier: row.isMultiplier,
      isActive: row.isActive,
    };
    map.set(rec.key, rec);
  }
  cache = { rules: map, loadedAt: now };
  return map;
}

export function getPricingRuleNumber(
  rules: PricingRuleMap,
  key: PricingRuleKey,
  fallback: number,
): number {
  const rec = rules.get(key);
  if (!rec || !rec.isActive) return fallback;
  if (!Number.isFinite(rec.numericValue) || rec.numericValue < 0) return fallback;
  return rec.numericValue;
}
