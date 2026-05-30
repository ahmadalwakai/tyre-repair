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

export type CoverageArea =
  | 'glasgow'
  | 'edinburgh'
  | 'aberdeen'
  | 'dundee'
  | 'dumfries_galloway'
  | 'falkirk_stirling'
  | 'outer_hebrides'
  | 'highlands'
  | 'ayrshire'
  | 'orkney_caithness'
  | 'fife'
  | 'lanarkshire'
  | 'paisley_renfrewshire'
  | 'perthshire'
  | 'borders'
  | 'shetland';

export interface CoverageCheckResult {
  covered: boolean;
  area: CoverageArea | null;
  /** The normalised postcode we evaluated, useful for client-side echoing. */
  normalizedPostcode: string;
}

/**
 * Service-area gate by UK postcode area code (leading letters).
 * We cover the whole of Scotland — every Scottish postcode area is accepted.
 * Distance-based risk (long-distance / outside normal dispatch range) is
 * handled separately by the pricing engine / profit guard, not here.
 *
 * Scottish postcode areas:
 *   AB Aberdeen, DD Dundee, DG Dumfries & Galloway, EH Edinburgh/Lothians,
 *   FK Falkirk/Stirling, G Glasgow, HS Outer Hebrides, IV Inverness/Highlands,
 *   KA Kilmarnock/Ayrshire, KW Kirkwall/Orkney/Caithness, KY Kirkcaldy/Fife,
 *   ML Motherwell/Lanarkshire (Coatbridge, Hamilton, Wishaw, etc.),
 *   PA Paisley/Renfrewshire/Argyll, PH Perth/Perthshire,
 *   TD Borders (Scottish Borders), ZE Shetland.
 */
const SCOTTISH_POSTCODE_AREAS: Record<string, CoverageArea> = {
  AB: 'aberdeen',
  DD: 'dundee',
  DG: 'dumfries_galloway',
  EH: 'edinburgh',
  FK: 'falkirk_stirling',
  G: 'glasgow',
  HS: 'outer_hebrides',
  IV: 'highlands',
  KA: 'ayrshire',
  KW: 'orkney_caithness',
  KY: 'fife',
  ML: 'lanarkshire',
  PA: 'paisley_renfrewshire',
  PH: 'perthshire',
  TD: 'borders',
  ZE: 'shetland',
};

function evaluateCoverage(postcode: string): { covered: boolean; area: CoverageArea | null } {
  // Match the postcode "area" portion: 1–2 letters followed by a digit.
  // e.g. ML5 -> ML, G31 -> G, EH1 -> EH, AB10 -> AB.
  const match = postcode.match(/^([A-Z]{1,2})\d/);
  const prefix = match?.[1];
  if (!prefix) return { covered: false, area: null };
  const area = SCOTTISH_POSTCODE_AREAS[prefix];
  if (area) return { covered: true, area };
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
