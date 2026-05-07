import { NextResponse } from 'next/server';
import { vehicleLookupSchema } from '@/lib/quote/validation';
import { lookupVehicleByRegistration } from '@/lib/integrations/dvla';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'invalid_body' }, { status: 400 });
  }

  const parsed = vehicleLookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid registration', code: 'invalid_registration' },
      { status: 400 },
    );
  }

  try {
    const result = await lookupVehicleByRegistration(parsed.data.registration);
    if (!result.ok) {
      // Treat "not configured" as a soft 503 so the UI can fall back to
      // manual vehicle entry rather than appearing to be a server crash.
      if (result.code === 'missing_api_key') {
        return NextResponse.json(
          {
            error: 'Vehicle lookup is not configured on this environment',
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
    return NextResponse.json(result.vehicle, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Vehicle lookup failed', code: 'unknown' },
      { status: 502 },
    );
  }
}
