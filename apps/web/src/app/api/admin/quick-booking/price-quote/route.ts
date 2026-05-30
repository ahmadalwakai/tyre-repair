/**
 * Admin-only price quote helper for the Quick Booking wizard.
 *
 * Wraps the public pricing engine but allows ASSESSMENT (no tyreId required).
 * Does NOT persist anything.
 *
 * Learning loop: blends recent admin price overrides for the same
 * (jobType, problemType, distance bucket) into the suggested price. See
 * `admin_price_overrides` table. Engine result is preserved as
 * `engineTotalPriceGbp` so the UI can show "original vs suggested".
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateDynamicQuote, PricingEngineError } from '@/lib/pricing';
import type { DynamicQuoteInput, ManualLocationInput } from '@/lib/pricing/types';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { db, schema, and, eq, gte, sql } from '@tyrerepair/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEARNING_WINDOW_DAYS = 60;
const LEARNING_MIN_SAMPLES = 3;
// Hard safety rails — never let a learned multiplier swing wildly even if a
// few admin edits were extreme. Outside this band the engine value is used.
const LEARNING_MULTIPLIER_MIN = 0.6;
const LEARNING_MULTIPLIER_MAX = 1.6;

function distanceBucket(miles: number | null | undefined): number | null {
  if (miles == null || !Number.isFinite(miles)) return null;
  if (miles < 5) return 0;
  if (miles < 10) return 1;
  if (miles < 20) return 2;
  if (miles < 40) return 3;
  return 4;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

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

    // ---- Apply learned admin adjustment (if enough recent samples) ----
    const engineTotalGbp = Number(result.pricing.totalPriceGbp);
    const milesRaw = result.pricing.breakdown.distance?.distanceMiles ?? null;
    const bucket = distanceBucket(milesRaw);
    const since = new Date(Date.now() - LEARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    let learnedAdjustment: {
      multiplier: number;
      sampleSize: number;
      windowDays: number;
    } | null = null;
    let appliedTotalGbpStr = result.pricing.totalPriceGbp;

    try {
      const whereParts = [
        eq(schema.adminPriceOverrides.jobType, data.jobType),
        gte(schema.adminPriceOverrides.createdAt, since),
      ];
      if (data.tyreProblemType) {
        whereParts.push(
          eq(schema.adminPriceOverrides.tyreProblemType, data.tyreProblemType),
        );
      }
      if (bucket != null) {
        whereParts.push(eq(schema.adminPriceOverrides.distanceBucket, bucket));
      }
      const rows = await db
        .select({
          multiplier: schema.adminPriceOverrides.adjustmentMultiplier,
        })
        .from(schema.adminPriceOverrides)
        .where(and(...whereParts))
        .limit(50);

      const multipliers = rows
        .map((r) => Number(r.multiplier))
        .filter((n) => Number.isFinite(n) && n > 0);

      if (multipliers.length >= LEARNING_MIN_SAMPLES) {
        const med = median(multipliers);
        const clamped = Math.min(
          LEARNING_MULTIPLIER_MAX,
          Math.max(LEARNING_MULTIPLIER_MIN, med),
        );
        learnedAdjustment = {
          multiplier: Math.round(clamped * 10000) / 10000,
          sampleSize: multipliers.length,
          windowDays: LEARNING_WINDOW_DAYS,
        };
        if (engineTotalGbp > 0) {
          appliedTotalGbpStr = (engineTotalGbp * clamped).toFixed(2);
        }
      }
    } catch {
      // Learning is best-effort — never fail the quote because of it.
    }

    const notes = [...(result.pricing.breakdown.notes ?? [])];
    if (learnedAdjustment) {
      const pct = ((learnedAdjustment.multiplier - 1) * 100).toFixed(1);
      const sign = learnedAdjustment.multiplier >= 1 ? '+' : '';
      notes.push(
        `Adjusted ${sign}${pct}% based on ${learnedAdjustment.sampleSize} recent admin edits (last ${learnedAdjustment.windowDays} days).`,
      );
    }

    const responseBody = {
      ...result,
      pricing: {
        ...result.pricing,
        totalPriceGbp: appliedTotalGbpStr,
        breakdown: {
          ...result.pricing.breakdown,
          notes,
        },
      },
      engineTotalPriceGbp: result.pricing.totalPriceGbp,
      suggestedTotalPriceGbp: appliedTotalGbpStr,
      learnedAdjustment,
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    if (err instanceof PricingEngineError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: 'Pricing engine failed' }, { status: 500 });
  }
}
