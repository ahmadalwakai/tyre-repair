import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, and, or, asc, ilike, gt, sql, type SQL } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  sizeLabel: z.string().trim().min(1).max(32).optional(),
  tier: z.enum(['budget', 'mid_range', 'premium']).optional(),
  availability: z.enum(['in_stock', 'low_stock', 'special_order']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', issues: parsed.error.issues }, { status: 400 });
  }
  const q = parsed.data;

  const filters: SQL[] = [];
  if (q.search) {
    const like = `%${q.search}%`;
    const sub = or(
      ilike(schema.tyreCatalog.sku, like),
      ilike(schema.tyreCatalog.brand, like),
      ilike(schema.tyreCatalog.model, like),
    );
    if (sub) filters.push(sub);
  }
  if (q.sizeLabel) filters.push(eq(schema.tyreCatalog.sizeLabel, q.sizeLabel));
  if (q.tier) filters.push(eq(schema.tyreCatalog.tier, q.tier));
  if (q.availability === 'in_stock') filters.push(gt(schema.stock.quantityAvailable, 0));
  if (q.availability === 'low_stock') {
    filters.push(sql`${schema.stock.quantityAvailable} <= ${schema.stock.lowStockThreshold}` as SQL);
  }
  if (q.availability === 'special_order') filters.push(eq(schema.stock.quantityAvailable, 0));
  if (q.cursor) filters.push(gt(schema.stock.id, q.cursor));

  const where = filters.length > 0 ? and(...filters) : undefined;

  let rows;
  try {
    rows = await db
      .select({
        stockId: schema.stock.id,
        tyreId: schema.tyreCatalog.id,
        sku: schema.tyreCatalog.sku,
        brand: schema.tyreCatalog.brand,
        model: schema.tyreCatalog.model,
        sizeLabel: schema.tyreCatalog.sizeLabel,
        tier: schema.tyreCatalog.tier,
        type: schema.tyreCatalog.type,
        fastFitAvailable: schema.tyreCatalog.fastFitAvailable,
        quantityAvailable: schema.stock.quantityAvailable,
        lowStockThreshold: schema.stock.lowStockThreshold,
        reservedQuantity: schema.stock.reservedQuantity,
        locationName: schema.stock.locationName,
        updatedAt: schema.stock.updatedAt,
      })
      .from(schema.stock)
      .innerJoin(schema.tyreCatalog, eq(schema.tyreCatalog.id, schema.stock.tyreId))
      .where(where)
      .orderBy(asc(schema.stock.id))
      .limit(q.limit + 1);
  } catch {
    return NextResponse.json({ error: 'Could not load stock' }, { status: 500 });
  }

  const items = rows.slice(0, q.limit).map((r) => {
    let availability: 'in_stock' | 'low_stock' | 'special_order';
    if (r.quantityAvailable === 0) availability = 'special_order';
    else if (r.quantityAvailable <= r.lowStockThreshold) availability = 'low_stock';
    else availability = 'in_stock';
    return {
      stockId: r.stockId,
      tyreId: r.tyreId,
      sku: r.sku,
      brand: r.brand,
      model: r.model,
      sizeLabel: r.sizeLabel,
      tier: r.tier,
      type: r.type,
      fastFitAvailable: !!r.fastFitAvailable,
      quantityAvailable: r.quantityAvailable,
      lowStockThreshold: r.lowStockThreshold,
      reservedQuantity: r.reservedQuantity,
      locationName: r.locationName,
      availability,
      updatedAt: r.updatedAt.toISOString(),
    };
  });
  const nextCursor = rows.length > q.limit ? rows[q.limit]?.stockId ?? null : null;

  return NextResponse.json({ items, nextCursor });
}
