import { NextResponse } from 'next/server';
import { db, schema, eq, and, asc, sql } from '@tyrerepair/db';
import { tyreSearchSchema } from '@/lib/quote/validation';
import { availabilityFromQuantity } from '@/lib/quote/tyres';
import type { TyreSearchResultItem } from '@/types/quote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const raw = {
    sizeLabel: url.searchParams.get('sizeLabel') ?? undefined,
    tier: url.searchParams.get('tier') ?? undefined,
    type: url.searchParams.get('type') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  };
  const parsed = tyreSearchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid filter', code: 'invalid_filter' }, { status: 400 });
  }
  const { sizeLabel, tier, type, limit } = parsed.data;

  try {
    const conditions = [eq(schema.tyreCatalog.isActive, true)];
    if (sizeLabel) conditions.push(eq(schema.tyreCatalog.sizeLabel, sizeLabel));
    if (tier) conditions.push(eq(schema.tyreCatalog.tier, tier));
    if (type) conditions.push(eq(schema.tyreCatalog.type, type));

    const rows = await db
      .select({
        tyreId: schema.tyreCatalog.id,
        sku: schema.tyreCatalog.sku,
        brand: schema.tyreCatalog.brand,
        model: schema.tyreCatalog.model,
        sizeLabel: schema.tyreCatalog.sizeLabel,
        width: schema.tyreCatalog.width,
        profile: schema.tyreCatalog.profile,
        rim: schema.tyreCatalog.rim,
        speedRating: schema.tyreCatalog.speedRating,
        loadIndex: schema.tyreCatalog.loadIndex,
        tier: schema.tyreCatalog.tier,
        type: schema.tyreCatalog.type,
        basePriceGbp: schema.tyreCatalog.basePriceGbp,
        quantityAvailable: schema.stock.quantityAvailable,
        lowStockThreshold: schema.stock.lowStockThreshold,
      })
      .from(schema.tyreCatalog)
      .leftJoin(schema.stock, eq(schema.stock.tyreId, schema.tyreCatalog.id))
      .where(and(...conditions))
      .orderBy(
        sql`CASE WHEN ${schema.tyreCatalog.tier} = 'budget' THEN 0 WHEN ${schema.tyreCatalog.tier} = 'mid_range' THEN 1 ELSE 2 END`,
        asc(schema.tyreCatalog.basePriceGbp),
      )
      .limit(limit);

    const items: TyreSearchResultItem[] = rows.map((r) => {
      const qty = r.quantityAvailable ?? 0;
      const low = r.lowStockThreshold ?? 2;
      const availability = availabilityFromQuantity(qty, low);
      return {
        tyreId: r.tyreId,
        sku: r.sku,
        brand: r.brand,
        model: r.model,
        sizeLabel: r.sizeLabel,
        width: r.width,
        profile: r.profile,
        rim: r.rim,
        speedRating: r.speedRating,
        loadIndex: r.loadIndex,
        tier: r.tier,
        type: r.type,
        basePriceGbp: Number(r.basePriceGbp),
        quantityAvailable: qty,
        lowStockThreshold: low,
        availability,
        isSpecialOrder: availability === 'special_order',
      };
    });

    // Stable post-sort: in-stock first within tier groups
    items.sort((a, b) => {
      const tierOrder = { budget: 0, mid_range: 1, premium: 2 } as const;
      if (sizeLabel) {
        const am = a.sizeLabel === sizeLabel ? 0 : 1;
        const bm = b.sizeLabel === sizeLabel ? 0 : 1;
        if (am !== bm) return am - bm;
      }
      const ta = tierOrder[a.tier];
      const tb = tierOrder[b.tier];
      if (ta !== tb) return ta - tb;
      const sa = a.availability === 'special_order' ? 1 : 0;
      const sb = b.availability === 'special_order' ? 1 : 0;
      if (sa !== sb) return sa - sb;
      return a.basePriceGbp - b.basePriceGbp;
    });

    // Deterministic recommendation badges. Mutates items in-place.
    assignRecommendationBadges(items, { tier });

    return NextResponse.json({ items, count: items.length }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Tyre search failed', code: 'db_error' }, { status: 500 });
  }
}

function assignRecommendationBadges(
  items: TyreSearchResultItem[],
  opts: { tier?: 'budget' | 'mid_range' | 'premium' | undefined },
): void {
  // Reset
  for (const it of items) {
    it.recommendationBadge = null;
  }
  const inStock = items.filter((i) => !i.isSpecialOrder);
  if (inStock.length === 0) {
    // No in-stock items: mark cheapest special-order item with no badge.
    // Spec: never apply 'fastest_fitting' to special_order; nothing to do.
    return;
  }

  // Track which item indices already received a badge so we set only one per item.
  const taken = new Set<string>();

  // 'fastest_fitting' — exactly ONE per result set: the first in-stock item
  // (which post-sort is the cheapest in-stock item across the highest-priority
  // tier). Never on special_order.
  const fastest = inStock[0];
  if (fastest) {
    fastest.recommendationBadge = 'fastest_fitting';
    taken.add(fastest.tyreId);
  }

  // If a tier filter is active and there is an in-stock item, also tag the
  // cheapest in-stock item for that tier with the tier-specific badge.
  if (opts.tier) {
    const tierMatch = inStock.find((i) => i.tier === opts.tier);
    if (tierMatch && !taken.has(tierMatch.tyreId)) {
      tierMatch.recommendationBadge =
        opts.tier === 'budget'
          ? 'budget_option'
          : opts.tier === 'premium'
            ? 'premium_option'
            : 'best_value';
      taken.add(tierMatch.tyreId);
    }
  } else {
    // No tier filter — surface tier-specific options for cross-tier comparison.
    const cheapestBudget = inStock.find((i) => i.tier === 'budget');
    if (cheapestBudget && !taken.has(cheapestBudget.tyreId)) {
      cheapestBudget.recommendationBadge = 'budget_option';
      taken.add(cheapestBudget.tyreId);
    }
    const cheapestMid = inStock.find((i) => i.tier === 'mid_range');
    if (cheapestMid && !taken.has(cheapestMid.tyreId)) {
      cheapestMid.recommendationBadge = 'best_value';
      taken.add(cheapestMid.tyreId);
    }
    const cheapestPremium = inStock.find((i) => i.tier === 'premium');
    if (cheapestPremium && !taken.has(cheapestPremium.tyreId)) {
      cheapestPremium.recommendationBadge = 'premium_option';
      taken.add(cheapestPremium.tyreId);
    }
  }
}
