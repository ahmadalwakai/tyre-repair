import { NextResponse } from 'next/server';
import { generateTyreShopSlots } from '@/lib/tyre-shop/slots';
import { getTyreShopFees } from '@/lib/tyre-shop/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const isBackorder = url.searchParams.get('isBackorder') === 'true';
  const fees = await getTyreShopFees();
  const slots = generateTyreShopSlots({
    isBackorder,
    backorderEtaWorkingDays: fees.backorderEtaWorkingDays,
  });
  return NextResponse.json({ slots, isBackorder }, { status: 200 });
}
