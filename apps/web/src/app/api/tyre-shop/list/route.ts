import { NextResponse } from 'next/server';
import { listTyreShopItems, listDistinctSizes, listDistinctBrands } from '@/lib/tyre-shop/catalog';
import type { TyreShopFilters } from '@/types/tyre-shop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const filters: TyreShopFilters = {};
  const sizeLabel = url.searchParams.get('sizeLabel');
  if (sizeLabel) filters.sizeLabel = sizeLabel;
  const brand = url.searchParams.get('brand');
  if (brand) filters.brand = brand;
  const tier = url.searchParams.get('tier');
  if (tier) filters.tier = tier;
  const season = url.searchParams.get('season');
  if (season) filters.season = season;
  if (url.searchParams.get('inStockOnly') === 'true') filters.inStockOnly = true;

  const includeFacets = url.searchParams.get('includeFacets') === 'true';
  try {
    const items = await listTyreShopItems(filters);
    if (!includeFacets) {
      return NextResponse.json({ items, count: items.length }, { status: 200 });
    }
    const [sizes, brands] = await Promise.all([listDistinctSizes(), listDistinctBrands()]);
    return NextResponse.json(
      { items, count: items.length, facets: { sizes, brands } },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: 'Could not load tyres', code: 'db_error' },
      { status: 500 },
    );
  }
}
