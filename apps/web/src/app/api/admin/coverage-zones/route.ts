import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import {
  createCoverageZone,
  getAllZones,
} from '@/lib/coverage/zones';
import type { CoverageZoneStatus } from '@/types/coverage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES: readonly CoverageZoneStatus[] = ['active', 'paused', 'unavailable'];

const createSchema = z
  .object({
    slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/i),
    name: z.string().trim().min(2).max(160),
    status: z.enum(STATUSES as unknown as [CoverageZoneStatus, ...CoverageZoneStatus[]]),
    cityOrRegion: z.string().trim().min(2).max(160),
    postcodePrefixes: z.array(z.string().trim().min(1).max(8)).min(1).max(40),
    basePostcode: z.string().trim().min(2).max(16),
    radiusMiles: z.number().int().min(0).max(500),
    estimatedResponseMinutesMin: z.number().int().min(0).max(1440),
    estimatedResponseMinutesMax: z.number().int().min(0).max(1440),
    callOutFeePence: z.number().int().min(0).max(1_000_000),
    availableNow: z.boolean(),
    availableToday: z.boolean(),
    availableTomorrow: z.boolean(),
    dailyCapacity: z.number().int().min(0).max(10_000),
    priority: z.number().int().min(0).max(999),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict();

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const zones = await getAllZones();
  return NextResponse.json({ zones });
}

export async function POST(req: Request): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
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
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.estimatedResponseMinutesMax < parsed.data.estimatedResponseMinutesMin) {
    return NextResponse.json(
      { error: 'estimatedResponseMinutesMax must be >= estimatedResponseMinutesMin' },
      { status: 400 },
    );
  }

  try {
    const zone = await createCoverageZone({
      ...parsed.data,
      slug: parsed.data.slug.toLowerCase(),
      notes: parsed.data.notes ?? null,
    });
    await writeAuditLogSafe({
      actorType: 'admin',
      action: 'coverage_zone.created',
      entityType: 'coverage_zone',
      entityId: zone.id,
      actorAdminId: admin.adminId,
      actorLabel: admin.email,
      before: null,
      after: zone as unknown as Record<string, unknown>,
      metadata: { slug: zone.slug },
    });
    return NextResponse.json({ zone }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create coverage zone';
    if (/duplicate|unique/i.test(message)) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
