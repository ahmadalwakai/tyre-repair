import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Valid UK outward-code prefix shapes; we only need the leading letters. */
const checkSchema = z.object({
  postcode: z
    .string()
    .min(2, 'Postcode is required')
    .max(16, 'Postcode is too long')
    .transform((v) => v.replace(/\s+/g, '').toUpperCase()),
});

export type CoverageArea = 'glasgow' | 'edinburgh';

export interface CoverageCheckResult {
  covered: boolean;
  area: CoverageArea | null;
  /** The normalised postcode we evaluated, useful for client-side echoing. */
  normalizedPostcode: string;
}

/**
 * Hardcoded service-area gate. Glasgow ('G') and Edinburgh ('EH') only.
 * The leading letters are the UK "area code" portion of a postcode and are
 * unambiguous enough for a binary in-area check. Replace with a live coverage
 * service when one exists.
 */
function evaluateCoverage(postcode: string): { covered: boolean; area: CoverageArea | null } {
  if (/^EH\d/.test(postcode)) return { covered: true, area: 'edinburgh' };
  if (/^G\d/.test(postcode)) return { covered: true, area: 'glasgow' };
  return { covered: false, area: null };
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'invalid_json' },
      { status: 400 },
    );
  }

  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid postcode',
        code: 'invalid_postcode',
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  try {
    const { covered, area } = evaluateCoverage(parsed.data.postcode);
    const result: CoverageCheckResult = {
      covered,
      area,
      normalizedPostcode: parsed.data.postcode,
    };
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Coverage check failed', code: 'server_error' },
      { status: 500 },
    );
  }
}
