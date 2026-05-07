/**
 * seed-stock.ts — Bulk upsert budget tyre stock into tyre_catalog + stock.
 *
 * Mirrors the size + quantity list from
 * https://github.com/ahmadalwakai/tyrerescue/blob/master/seed-stock.ts
 *
 * Usage:
 *   npm --workspace @tyrerepair/db run seed:stock
 *   # or
 *   npx tsx packages/db/src/seed-stock.ts
 *
 * Behaviour:
 *   - For each size in RAW_DATA, parse width/aspect/rim/commercial flag.
 *   - Deduplicate: duplicate sizes have their quantities summed.
 *   - Upsert a budget-tier tyre_catalog row for each size (matched by SKU).
 *   - Upsert a stock row keyed by tyre_id, set quantity_available to the listed total.
 *   - Catalogue rows for sizes outside this list are left untouched.
 *   - Stock rows for sizes outside this list are left untouched.
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from './client';
import { stock, tyreCatalog } from './schema';

interface ParsedSize {
  sizeRaw: string;
  width: number;
  aspect: number; // 0 for old-style sizes like "155/R13"
  rim: number;
  isCommercial: boolean;
}

interface StockEntry extends ParsedSize {
  quantity: number;
}

function parseSizeString(raw: string): ParsedSize | null {
  const s = raw.trim().toUpperCase();
  const m = s.match(/^(\d+)\/(?:(\d+)\/)?R(\d+)(C?)$/);
  if (!m) return null;
  return {
    sizeRaw: raw.trim(),
    width: Number(m[1]),
    aspect: m[2] ? Number(m[2]) : 0,
    rim: Number(m[3]),
    isCommercial: m[4] === 'C',
  };
}

function makeSizeDisplay(e: ParsedSize): string {
  const rimStr = `R${e.rim}${e.isCommercial ? 'C' : ''}`;
  return e.aspect > 0 ? `${e.width}/${e.aspect}/${rimStr}` : `${e.width}/${rimStr}`;
}

function makeSizeLabel(e: ParsedSize): string {
  // Standard Drizzle schema label, e.g. "175/65R14" or "175/R13" for old-style
  const rimStr = `R${e.rim}${e.isCommercial ? 'C' : ''}`;
  return e.aspect > 0 ? `${e.width}/${e.aspect}${rimStr}` : `${e.width}/${rimStr}`;
}

function speedRatingFor(rim: number): string {
  if (rim <= 15) return 'H';
  if (rim <= 18) return 'V';
  return 'W';
}

function loadIndexFor(width: number, aspect: number): number {
  const vol = width * ((aspect || 80) / 100);
  if (vol < 80) return 82;
  if (vol < 95) return 86;
  if (vol < 110) return 91;
  if (vol < 125) return 94;
  if (vol < 140) return 97;
  return 100;
}

// Budget tier rim → £ price (matches tyrerescue/lib/inventory/default-price-map.ts).
const DEFAULT_BUDGET_PRICE_BY_RIM: Readonly<Record<number, number>> = {
  10: 48, 12: 48, 13: 48, 14: 48,
  15: 58, 16: 58,
  17: 72, 18: 72,
  19: 92, 20: 92,
  21: 115, 22: 130, 23: 145,
};

function getDefaultPriceString(rim: number): string {
  const price = DEFAULT_BUDGET_PRICE_BY_RIM[rim] ?? 58;
  return price.toFixed(2);
}

function makeSku(e: ParsedSize): string {
  // e.g. TR-BUD-175-65-R14, TR-BUD-175-0-R13, TR-BUD-195-75-R16C
  const profilePart = String(e.aspect || 0).padStart(2, '0');
  const rimPart = `R${e.rim}${e.isCommercial ? 'C' : ''}`;
  return `TR-BUD-${e.width}-${profilePart}-${rimPart}`;
}

const RAW_DATA: ReadonlyArray<readonly [string, number]> = [
  ['155/R13', 2], ['155/65/R14', 2], ['155/70/R12', 1], ['155/80/R13', 1],
  ['165/60/R14', 3], ['165/60/R15', 2], ['165/65/R14', 3], ['165/65/R15', 2],
  ['165/70/R14', 3], ['175/R13', 3], ['175/R16C', 0], ['175/50/R15', 1],
  ['175/55/R20', 1], ['175/60/R15', 5], ['175/60/R16', 1], ['175/60/R18', 1],
  ['175/65/R14', 2], ['175/65/R15', 3], ['175/65/R17', 1], ['175/70/R13', 1],
  ['175/70/R14', 3], ['175/80/R16', 1], ['185/55/R15', 3], ['185/55/R16', 3],
  ['185/60/R14', 2], ['185/60/R15', 5], ['185/60/R16', 3], ['185/65/R14', 2],
  ['185/65/R15', 3], ['185/70/R14', 3], ['185/75/R16C', 2], ['195/40/R17', 2],
  ['195/45/R16', 6], ['195/50/R15', 3], ['195/50/R16', 2], ['195/55/R10', 2],
  ['195/55/R15', 2], ['195/55/R16', 5], ['195/60/R15', 5], ['195/60/R16', 4],
  ['195/60/R16C', 1], ['195/60/R18', 2], ['195/65/R15', 6], ['195/65/R16C', 3],
  ['195/70/R15C', 1], ['195/75/R16C', 8], ['205/40/R17', 3], ['205/40/R18', 3],
  ['205/45/R16', 3], ['205/45/R17', 0], ['205/50/R16', 1], ['205/50/R17', 4],
  ['205/55/R15', 1], ['205/55/R16', 6], ['205/55/R17', 3], ['205/55/R19', 4],
  ['205/60/R15', 2], ['205/60/R16', 4], ['205/65/R15', 1], ['205/65/R15C', 2],
  ['205/65/R16', 1], ['205/65/R16C', 4], ['205/75/R16C', 2], ['215/40/R16', 1],
  ['215/40/R17', 2], ['215/40/R18', 2], ['215/45/R16', 4], ['215/45/R17', 4],
  ['215/45/R18', 2], ['215/45/R20', 1], ['215/50/R17', 8], ['215/50/R18', 1],
  ['215/50/R18', 4], ['215/55/R16', 2], ['215/55/R17', 6], ['215/55/R18', 4],
  ['215/60/R16', 3], ['215/60/R16C', 3], ['215/60/R17', 4], ['215/60/R17C', 2],
  ['215/65/R15C', 9], ['215/65/R16', 3], ['215/65/R16C', 3], ['215/65/R17', 2],
  ['215/70/R15C', 3], ['215/70/R16', 3], ['215/70/R16C', 2], ['215/75/R16C', 1],
  ['225/30/R20', 1], ['225/35/R17', 1], ['225/35/R18', 2], ['225/35/R19', 4],
  ['225/35/R20', 2], ['225/40/R18', 1], ['225/40/R19', 3], ['225/40/R20', 2],
  ['225/45/R17', 6], ['225/45/R18', 6], ['225/45/R19', 1], ['225/50/R16', 1],
  ['225/50/R17', 4], ['225/50/R18', 3], ['225/55/R16', 1], ['225/55/R17', 4],
  ['225/55/R18', 5], ['225/55/R19', 2], ['225/60/R17', 3], ['225/60/R18', 3],
  ['225/65/R16C', 3], ['225/65/R17', 4], ['225/65/R18', 1], ['225/70/R15C', 2],
  ['225/70/R16', 2], ['225/75/R16C', 1], ['235/35/R19', 4], ['235/35/R20', 0],
  ['235/40/R18', 3], ['235/40/R19', 2], ['235/45/R17', 2], ['235/45/R18', 3],
  ['235/45/R19', 3], ['235/45/R20', 2], ['235/45/R21', 2], ['235/50/R18', 3],
  ['235/50/R19', 3], ['235/50/R20', 2], ['235/55/R17', 2], ['235/55/R18', 1],
  ['235/55/R19', 3], ['235/60/R16', 1], ['235/60/R17', 2], ['235/60/R18', 3],
  ['235/65/R16C', 3], ['235/65/R17', 2], ['235/65/R18', 1], ['245/30/R20', 1],
  ['245/35/R18', 4], ['245/35/R19', 2], ['245/35/R20', 2], ['245/40/R17', 3],
  ['245/40/R18', 3], ['245/40/R19', 4], ['245/40/R20', 1], ['245/40/R21', 1],
  ['245/45/R17', 2], ['245/45/R18', 3], ['245/45/R19', 2], ['245/45/R20', 2],
  ['245/45/R21', 1], ['245/50/R18', 2], ['245/50/R19', 2], ['245/50/R20', 2],
  ['255/30/R19', 2], ['255/30/R20', 3], ['255/35/R18', 2], ['255/35/R19', 3],
  ['255/35/R20', 3], ['255/35/R21', 2], ['255/40/R18', 2], ['255/40/R19', 2],
  ['255/40/R20', 1], ['255/40/R20', 3], ['255/40/R21', 2], ['255/45/R18', 3],
  ['255/45/R19', 4], ['255/45/R20', 2], ['255/50/R19', 2], ['255/50/R20', 2],
  ['255/55/R18', 2], ['255/55/R19', 2], ['255/55/R20', 3], ['255/60/R18', 2],
  ['255/60/R19', 1], ['255/65/R18', 1],
];

async function main(): Promise<void> {
  // Deduplicate sizes (sum quantities for duplicates).
  const sizeMap = new Map<string, StockEntry>();
  let skipped = 0;
  for (const [raw, qty] of RAW_DATA) {
    const parsed = parseSizeString(raw);
    if (!parsed) {
      skipped += 1;
      console.warn(`  SKIP unparseable size: ${raw}`);
      continue;
    }
    const key = makeSizeDisplay(parsed);
    const existing = sizeMap.get(key);
    if (existing) {
      existing.quantity += qty;
    } else {
      sizeMap.set(key, { ...parsed, quantity: qty });
    }
  }

  console.log(`Seeding ${sizeMap.size} budget tyre sizes (skipped ${skipped})…\n`);

  let catCreated = 0;
  let catUpdated = 0;
  let stockCreated = 0;
  let stockUpdated = 0;

  for (const entry of sizeMap.values()) {
    const sku = makeSku(entry);
    const sizeLabel = makeSizeLabel(entry);
    // tyre_catalog requires profile > 0; old-format sizes (aspect=0) get profile=80
    // (the same default used by loadIndexFor) and are tagged as commercial when relevant.
    const profile = entry.aspect > 0 ? entry.aspect : 80;
    const tyreType: 'commercial' | 'all_season' = entry.isCommercial
      ? 'commercial'
      : 'all_season';
    const model = entry.isCommercial ? 'Commercial All-Season' : 'All-Season';
    const basePriceGbp = getDefaultPriceString(entry.rim);

    // 1. Upsert tyre_catalog row by SKU.
    const existingCat = await db
      .select({ id: tyreCatalog.id })
      .from(tyreCatalog)
      .where(eq(tyreCatalog.sku, sku))
      .limit(1);

    let tyreId: string;
    if (existingCat[0]) {
      tyreId = existingCat[0].id;
      await db
        .update(tyreCatalog)
        .set({
          brand: 'Budget',
          model,
          width: entry.width,
          profile,
          rim: entry.rim,
          sizeLabel,
          speedRating: speedRatingFor(entry.rim),
          loadIndex: String(loadIndexFor(entry.width, entry.aspect)),
          tier: 'budget',
          type: tyreType,
          basePriceGbp,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(tyreCatalog.id, tyreId));
      catUpdated += 1;
    } else {
      const inserted = await db
        .insert(tyreCatalog)
        .values({
          sku,
          brand: 'Budget',
          model,
          width: entry.width,
          profile,
          rim: entry.rim,
          sizeLabel,
          speedRating: speedRatingFor(entry.rim),
          loadIndex: String(loadIndexFor(entry.width, entry.aspect)),
          tier: 'budget',
          type: tyreType,
          basePriceGbp,
          isActive: true,
        })
        .returning({ id: tyreCatalog.id });
      const newRow = inserted[0];
      if (!newRow) {
        console.warn(`  SKIP ${sizeLabel} — catalogue insert returned no row`);
        continue;
      }
      tyreId = newRow.id;
      catCreated += 1;
    }

    // 2. Upsert stock row keyed by tyre_id (unique).
    const existingStock = await db
      .select({ id: stock.id })
      .from(stock)
      .where(eq(stock.tyreId, tyreId))
      .limit(1);

    if (existingStock[0]) {
      await db
        .update(stock)
        .set({ quantityAvailable: entry.quantity, updatedAt: new Date() })
        .where(eq(stock.id, existingStock[0].id));
      stockUpdated += 1;
      console.log(
        `  ✓ ${sizeLabel.padEnd(14)} stock → ${entry.quantity} (updated)`,
      );
    } else {
      await db.insert(stock).values({
        tyreId,
        quantityAvailable: entry.quantity,
      });
      stockCreated += 1;
      console.log(
        `  + ${sizeLabel.padEnd(14)} stock → ${entry.quantity} (created)`,
      );
    }
  }

  console.log(
    `\nDone. tyre_catalog: ${catCreated} created, ${catUpdated} updated. ` +
      `stock: ${stockCreated} created, ${stockUpdated} updated.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
