import { NextResponse } from 'next/server';
import { db, schema, eq, and, sql } from '@tyrerepair/db';

export const runtime = 'nodejs';
/** Cache distinct size list for 60s — stock changes are bursty but tolerable. */
export const revalidate = 60;

export interface TyreSizesResponse {
  sizes: string[];
  count: number;
}

/**
 * GET /api/tyres/sizes — distinct tyre size labels that currently have stock.
 *
 * Stock-aware: only returns sizes where at least one active tyre has
 * `stock.quantityAvailable - stock.reservedQuantity > 0`.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const rows = await db
      .selectDistinct({ sizeLabel: schema.tyreCatalog.sizeLabel })
      .from(schema.tyreCatalog)
      .innerJoin(schema.stock, eq(schema.stock.tyreId, schema.tyreCatalog.id))
      .where(
        and(
          eq(schema.tyreCatalog.isActive, true),
          sql`${schema.stock.quantityAvailable} - ${schema.stock.reservedQuantity} > 0`,
        ),
      );

    const sizes = rows
      .map((r) => r.sizeLabel)
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
      .sort();

    const payload: TyreSizesResponse = { sizes, count: sizes.length };
    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not load tyre sizes', code: 'db_error' },
      { status: 500 },
    );
  }
}
