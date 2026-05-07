/**
 * Admin-only price quote helper for the Quick Booking wizard.
 *
 * Wraps the public pricing engine but allows ASSESSMENT (no tyreId required).
 * Does NOT persist anything.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateDynamicQuote, PricingEngineError } from '@/lib/pricing';
import type { DynamicQuoteInput, ManualLocationInput } from '@/lib/pricing/types';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const manualLocationSchema = z.object({
  addressLine1: z.string().min(2).max(240),
  addressLine2: z.string().max(240).optional(),
  city: z.string().min(2).max(120).default('Glasgow'),
  postcode: z.string().min(3).max(20),
  country: z.string().max(80).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const bodySchema = z.object({
  jobType: z.enum(['ASSESSMENT', 'REPLACEMENT']).default('ASSESSMENT'),
  tyreProblemType: z
    .enum([
      'PUNCTURE_OR_FLAT',
      'DAMAGED_OR_BLOWN_OUT',
      'SLOW_PRESSURE_LOSS',
      'NEEDS_REPLACEMENT',
      'NOT_SURE',
    ])
    .optional(),
  tyreId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  manualLocation: manualLocationSchema.optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid pricing request', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.jobType === 'REPLACEMENT' && !data.tyreId) {
    return NextResponse.json(
      { error: 'tyreId is required for REPLACEMENT pricing' },
      { status: 400 },
    );
  }

  const input: DynamicQuoteInput = {
    jobType: data.jobType,
    pricingChannel: 'ADMIN_PHONE_BOOKING',
  };
  if (data.tyreId) input.tyreId = data.tyreId;
  if (data.tyreProblemType) input.tyreProblemType = data.tyreProblemType;
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
