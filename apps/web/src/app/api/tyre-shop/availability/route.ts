import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadTyreShopCatalogRow } from '@/lib/tyre-shop/catalog';
import { getTyreShopFees } from '@/lib/tyre-shop/settings';
import type { TyreAvailabilityResponse } from '@/types/tyre-shop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  tyreCatalogId: z.string().uuid(),
  quantity: z.number().int().min(1).max(8),
});

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'invalid_json' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid availability input', code: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const tyre = await loadTyreShopCatalogRow(parsed.data.tyreCatalogId);
  if (!tyre) {
    return NextResponse.json(
      { error: 'Tyre not found', code: 'tyre_not_found' },
      { status: 404 },
    );
  }
  const fees = await getTyreShopFees();
  const available = tyre.effectiveStock >= parsed.data.quantity;
  const payload: TyreAvailabilityResponse = {
    available,
    effectiveStock: tyre.effectiveStock,
    canOrderWithin3WorkingDays: !available,
  };
  if (!available) {
    payload.message = `Out of stock — order with backorder fitted within ${fees.backorderEtaWorkingDays} working days.`;
  }
  return NextResponse.json(payload, { status: 200 });
}
