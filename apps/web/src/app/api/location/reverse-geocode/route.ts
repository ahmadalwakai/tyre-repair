import { NextResponse } from 'next/server';
import { z } from 'zod';
import { reverseGeocodeCoordinates } from '@/lib/integrations/mapbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'invalid_body' },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid coordinates', code: 'invalid_coordinates' },
      { status: 400 },
    );
  }

  try {
    const result = await reverseGeocodeCoordinates(parsed.data);
    if (!result.ok) {
      // Soft 503 when not configured so UI can fall back gracefully.
      if (result.code === 'missing_token') {
        return NextResponse.json(
          {
            error: 'Reverse geocoding is not configured on this environment',
            code: 'lookup_unavailable',
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: result.status },
      );
    }

    return NextResponse.json(
      {
        success: true,
        location: {
          latitude: result.address.latitude,
          longitude: result.address.longitude,
          addressLine1: result.address.addressLine1,
          addressLine2: result.address.addressLine2,
          city: result.address.city,
          postcode: result.address.postcode,
          country: result.address.country,
          formattedAddress: result.address.formattedAddress,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: 'Reverse geocoding failed', code: 'unknown' },
      { status: 502 },
    );
  }
}
