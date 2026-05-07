import { NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateDynamicQuote, PricingEngineError } from '@/lib/pricing';
import type { DynamicQuoteInput, ManualLocationInput } from '@/lib/pricing/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const manualLocationSchema = z.object({
  addressLine1: z.string().min(2).max(240),
  addressLine2: z.string().max(240).optional(),
  city: z.string().min(2).max(120),
  postcode: z.string().min(3).max(20),
  country: z.string().max(80).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const pricingQuoteSchema = z.object({
  tyreId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  manualLocation: manualLocationSchema.optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = pricingQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid pricing quote request', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const input: DynamicQuoteInput = {
    tyreId: data.tyreId,
    pricingChannel: 'PUBLIC_SELF_BOOKING',
  };
  if (data.locationId) input.locationId = data.locationId;
  if (data.manualLocation) {
    const m: ManualLocationInput = {
      addressLine1: data.manualLocation.addressLine1,
      city: data.manualLocation.city,
      postcode: data.manualLocation.postcode,
      ...(data.manualLocation.addressLine2 ? { addressLine2: data.manualLocation.addressLine2 } : {}),
      ...(data.manualLocation.country ? { country: data.manualLocation.country } : {}),
      ...(typeof data.manualLocation.latitude === 'number'
        ? { latitude: data.manualLocation.latitude }
        : {}),
      ...(typeof data.manualLocation.longitude === 'number'
        ? { longitude: data.manualLocation.longitude }
        : {}),
    };
    input.manualLocation = m;
  }

  try {
    const result = await calculateDynamicQuote(input);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof PricingEngineError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: 'Pricing engine failed' }, { status: 500 });
  }
}
