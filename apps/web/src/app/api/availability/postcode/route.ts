import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { postcodeAvailabilityRequestSchema } from '@/lib/coverage/postcode';
import { buildPostcodeAvailability } from '@/lib/coverage/availability';
import type {
  AvailabilityApiResponse,
  PostcodeAvailabilityResult,
} from '@/types/coverage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function errorResponse(
  code: 'INVALID_POSTCODE' | 'EMPTY_POSTCODE' | 'INVALID_JSON' | 'SERVER_ERROR',
  message: string,
  status: number,
): NextResponse<AvailabilityApiResponse<PostcodeAvailabilityResult>> {
  return NextResponse.json<AvailabilityApiResponse<PostcodeAvailabilityResult>>(
    { ok: false, error: { code, message } },
    { status },
  );
}

export async function POST(
  req: Request,
): Promise<NextResponse<AvailabilityApiResponse<PostcodeAvailabilityResult>>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Invalid request body.', 400);
  }

  let parsed;
  try {
    parsed = postcodeAvailabilityRequestSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0]?.message ?? 'Enter a valid UK postcode.';
      const code = first.toLowerCase().includes('required')
        ? 'EMPTY_POSTCODE'
        : 'INVALID_POSTCODE';
      return errorResponse(code, first, 400);
    }
    return errorResponse('INVALID_POSTCODE', 'Enter a valid UK postcode.', 400);
  }

  try {
    const result = await buildPostcodeAvailability({
      normalizedPostcode: parsed.postcode,
      intent: parsed.intent ?? 'emergency_mobile_tyre_fitting',
      source: parsed.source ?? 'landing_page',
    });
    return NextResponse.json<AvailabilityApiResponse<PostcodeAvailabilityResult>>(
      { ok: true, data: result },
      { status: 200 },
    );
  } catch {
    return errorResponse('SERVER_ERROR', 'Availability check failed.', 500);
  }
}
