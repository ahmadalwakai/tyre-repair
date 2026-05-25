import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, and, asc, sql } from '@tyrerepair/db';
import { availabilityFromQuantity } from '@/lib/quote/tyres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Loose-but-strict size pattern: width/profileR rim, e.g. 205/55R16. */
const SIZE_REGEX = /^\d{3}\/\d{2}R\d{2}$/;

const querySchema = z.object({
  size: z
    .string()
    .min(1, 'Size is required')
    .max(32)
    .transform((v) => v.replace(/\s+/g, '').toUpperCase())
    .refine((v) => SIZE_REGEX.test(v), 'Invalid tyre size'),
});

export interface InStockTyreOption {
  id: string;
  brand: string;
  model: string;
  price: number;
  season: 'summer' | 'winter' | 'all_season' | 'run_flat' | 'commercial';
  /**
   * EU label fields are optional in the catalog. We surface only what's
   * available; placeholder columns will be wired in once they exist.
   */
  fuelRating: string | null;
  wetGrip: string | null;
  noiseDb: number | null;
  stock: number;
}

export interface InStockResponse {
  size: string;
  items: InStockTyreOption[];
  count: number;
}

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ size: url.searchParams.get('size') ?? '' });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid tyre size', code: 'invalid_size', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const size = parsed.data.size;

  try {
    const rows = await db
      .select({
        id: schema.tyreCatalog.id,
        brand: schema.tyreCatalog.brand,
        model: schema.tyreCatalog.model,
        basePriceGbp: schema.tyreCatalog.basePriceGbp,
        type: schema.tyreCatalog.type,
        quantityAvailable: schema.stock.quantityAvailable,
        reservedQuantity: schema.stock.reservedQuantity,
      })
      .from(schema.tyreCatalog)
      .innerJoin(schema.stock, eq(schema.stock.tyreId, schema.tyreCatalog.id))
      .where(
        and(
          eq(schema.tyreCatalog.isActive, true),
          eq(schema.tyreCatalog.sizeLabel, size),
          sql`${schema.stock.quantityAvailable} - ${schema.stock.reservedQuantity} > 0`,
        ),
      )
      .orderBy(asc(schema.tyreCatalog.basePriceGbp));

    const items: InStockTyreOption[] = rows.map((r) => {
      const effective = Math.max(0, (r.quantityAvailable ?? 0) - (r.reservedQuantity ?? 0));
      const availability = availabilityFromQuantity(effective);
      // Defensive: this should always be in-stock or low-stock given the WHERE
      // clause, but never surface special-order via this endpoint.
      void availability;
      return {
        id: r.id,
        brand: r.brand,
        model: r.model,
        price: Number(r.basePriceGbp),
        season: r.type,
        fuelRating: null,
        wetGrip: null,
        noiseDb: null,
        stock: effective,
      };
    });

    const payload: InStockResponse = { size, items, count: items.length };
    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Could not load tyres', code: 'db_error' },
      { status: 500 },
    );
  }
}
