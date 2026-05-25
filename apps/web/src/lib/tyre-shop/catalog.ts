/**
 * Tyre Shop catalog/stock data access.
 *
 * Reuses tyre_catalog + stock with the existing effective-stock formula
 * (`quantity_available - reserved_quantity`). Read-only.
 */
import { db, schema, eq, and, asc, sql, inArray } from '@tyrerepair/db';
import type { TyreShopFilters, TyreShopItem, TyreShopStockStatus } from '@/types/tyre-shop';

function stockStatusFor(effective: number, low: number): TyreShopStockStatus {
  if (effective <= 0) return 'OUT_OF_STOCK';
  if (effective <= low) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export async function listTyreShopItems(
  filters: TyreShopFilters,
  limit = 60,
): Promise<TyreShopItem[]> {
  const conditions = [eq(schema.tyreCatalog.isActive, true)];
  if (filters.sizeLabel) {
    conditions.push(eq(schema.tyreCatalog.sizeLabel, filters.sizeLabel));
  }
  if (filters.brand) {
    conditions.push(eq(schema.tyreCatalog.brand, filters.brand));
  }
  if (
    filters.tier === 'budget' ||
    filters.tier === 'mid_range' ||
    filters.tier === 'premium'
  ) {
    conditions.push(eq(schema.tyreCatalog.tier, filters.tier));
  }
  if (
    filters.season === 'summer' ||
    filters.season === 'winter' ||
    filters.season === 'all_season' ||
    filters.season === 'run_flat' ||
    filters.season === 'commercial'
  ) {
    conditions.push(eq(schema.tyreCatalog.type, filters.season));
  }
  if (filters.inStockOnly) {
    conditions.push(
      sql`${schema.stock.quantityAvailable} - ${schema.stock.reservedQuantity} > 0`,
    );
  }

  const rows = await db
    .select({
      id: schema.tyreCatalog.id,
      sizeLabel: schema.tyreCatalog.sizeLabel,
      width: schema.tyreCatalog.width,
      profile: schema.tyreCatalog.profile,
      rim: schema.tyreCatalog.rim,
      brand: schema.tyreCatalog.brand,
      model: schema.tyreCatalog.model,
      tier: schema.tyreCatalog.tier,
      type: schema.tyreCatalog.type,
      basePriceGbp: schema.tyreCatalog.basePriceGbp,
      fastFitAvailable: schema.tyreCatalog.fastFitAvailable,
      quantityAvailable: schema.stock.quantityAvailable,
      reservedQuantity: schema.stock.reservedQuantity,
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

  return rows.map((r) => {
    const qty = r.quantityAvailable ?? 0;
    const reserved = r.reservedQuantity ?? 0;
    const low = r.lowStockThreshold ?? 2;
    const effective = Math.max(0, qty - reserved);
    return {
      id: r.id,
      sizeLabel: r.sizeLabel,
      width: r.width,
      profile: r.profile,
      rim: r.rim,
      brand: r.brand,
      model: r.model,
      tier: r.tier,
      season: r.type,
      basePriceGbp: Number(r.basePriceGbp),
      fastFitAvailable: r.fastFitAvailable,
      effectiveStock: effective,
      stockStatus: stockStatusFor(effective, low),
    };
  });
}

export interface TyreShopCatalogRow {
  id: string;
  sizeLabel: string;
  brand: string;
  model: string;
  basePriceGbp: number;
  effectiveStock: number;
  lowStockThreshold: number;
}

export async function loadTyreShopCatalogRow(
  tyreId: string,
): Promise<TyreShopCatalogRow | null> {
  const rows = await db
    .select({
      id: schema.tyreCatalog.id,
      sizeLabel: schema.tyreCatalog.sizeLabel,
      brand: schema.tyreCatalog.brand,
      model: schema.tyreCatalog.model,
      basePriceGbp: schema.tyreCatalog.basePriceGbp,
      isActive: schema.tyreCatalog.isActive,
      quantityAvailable: schema.stock.quantityAvailable,
      reservedQuantity: schema.stock.reservedQuantity,
      lowStockThreshold: schema.stock.lowStockThreshold,
    })
    .from(schema.tyreCatalog)
    .leftJoin(schema.stock, eq(schema.stock.tyreId, schema.tyreCatalog.id))
    .where(eq(schema.tyreCatalog.id, tyreId))
    .limit(1);
  const r = rows[0];
  if (!r || !r.isActive) return null;
  const qty = r.quantityAvailable ?? 0;
  const reserved = r.reservedQuantity ?? 0;
  return {
    id: r.id,
    sizeLabel: r.sizeLabel,
    brand: r.brand,
    model: r.model,
    basePriceGbp: Number(r.basePriceGbp),
    effectiveStock: Math.max(0, qty - reserved),
    lowStockThreshold: r.lowStockThreshold ?? 2,
  };
}

export async function listDistinctSizes(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ sizeLabel: schema.tyreCatalog.sizeLabel })
    .from(schema.tyreCatalog)
    .where(eq(schema.tyreCatalog.isActive, true));
  return rows
    .map((r) => r.sizeLabel)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .sort();
}

export async function listDistinctBrands(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ brand: schema.tyreCatalog.brand })
    .from(schema.tyreCatalog)
    .where(eq(schema.tyreCatalog.isActive, true));
  return rows
    .map((r) => r.brand)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .sort();
}

// Suppress unused-import lint for future query expansion.
void inArray;
