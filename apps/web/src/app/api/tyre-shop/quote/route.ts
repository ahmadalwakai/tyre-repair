import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadTyreShopCatalogRow } from '@/lib/tyre-shop/catalog';
import { getTyreShopFees } from '@/lib/tyre-shop/settings';
import { calculateTyreShopQuote } from '@/lib/tyre-shop/pricing';
import { expectedReadyDateLabel } from '@/lib/tyre-shop/slots';
import type { TyreShopQuoteResponse } from '@/types/tyre-shop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fittingMethodSchema = z.union([z.literal('GARAGE'), z.literal('HOME')]);
const wheelNutSchema = z.union([z.literal('HAS_KEY'), z.literal('NO_KEY')]);

const addressSchema = z
  .object({
    line1: z.string().max(240).optional(),
    line2: z.string().max(240).optional(),
    city: z.string().max(120).optional(),
    postcode: z.string().max(16).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    formattedAddress: z.string().max(320).optional(),
  })
  .optional();

const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

const bodySchema = z.object({
  tyreCatalogId: z.string().uuid(),
  quantity: z.number().int().min(1).max(8),
  fittingMethod: fittingMethodSchema,
  address: addressSchema,
  selectedSlot: slotSchema,
  wheelNutAnswer: wheelNutSchema,
  acceptsBackorder: z.boolean().optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'invalid_json' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid quote input', code: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const tyre = await loadTyreShopCatalogRow(data.tyreCatalogId);
  if (!tyre) {
    return NextResponse.json(
      { error: 'Tyre not found', code: 'tyre_not_found' },
      { status: 404 },
    );
  }
  const fees = await getTyreShopFees();
  const result = calculateTyreShopQuote({
    basePriceGbp: tyre.basePriceGbp,
    quantity: data.quantity,
    fittingMethod: data.fittingMethod,
    effectiveStock: tyre.effectiveStock,
    fees,
    latitude: data.address?.latitude ?? null,
    longitude: data.address?.longitude ?? null,
    wheelNutAnswer: data.wheelNutAnswer,
  });

  const expectedReadyDate = expectedReadyDateLabel({
    isBackorder: result.isBackorder,
    backorderEtaWorkingDays: fees.backorderEtaWorkingDays,
  });

  const payload: TyreShopQuoteResponse = {
    allowed: result.allowed,
    available: result.available,
    isBackorder: result.isBackorder,
    priceBreakdown: result.priceBreakdown,
  };
  if (result.blockedReason) payload.blockedReason = result.blockedReason;
  if (result.message) payload.message = result.message;
  if (result.distanceMiles !== null) payload.distanceMiles = result.distanceMiles;
  if (expectedReadyDate) payload.expectedReadyDate = expectedReadyDate;

  return NextResponse.json(payload, { status: 200 });
}
