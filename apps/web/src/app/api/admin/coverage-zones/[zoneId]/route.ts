import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import {
  deleteCoverageZone,
  getAllZones,
  updateCoverageZone,
} from '@/lib/coverage/zones';
import type { CoverageZoneStatus } from '@/types/coverage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES: readonly CoverageZoneStatus[] = ['active', 'paused', 'unavailable'];

const patchSchema = z
  .object({
    slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/i).optional(),
    name: z.string().trim().min(2).max(160).optional(),
    status: z
      .enum(STATUSES as unknown as [CoverageZoneStatus, ...CoverageZoneStatus[]])
      .optional(),
    cityOrRegion: z.string().trim().min(2).max(160).optional(),
    postcodePrefixes: z.array(z.string().trim().min(1).max(8)).min(1).max(40).optional(),
    basePostcode: z.string().trim().min(2).max(16).optional(),
    radiusMiles: z.number().int().min(0).max(500).optional(),
    estimatedResponseMinutesMin: z.number().int().min(0).max(1440).optional(),
    estimatedResponseMinutesMax: z.number().int().min(0).max(1440).optional(),
    callOutFeePence: z.number().int().min(0).max(1_000_000).optional(),
    availableNow: z.boolean().optional(),
    availableToday: z.boolean().optional(),
    availableTomorrow: z.boolean().optional(),
    dailyCapacity: z.number().int().min(0).max(10_000).optional(),
    priority: z.number().int().min(0).max(999).optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findZone(zoneId: string) {
  const zones = await getAllZones();
  return zones.find((z) => z.id === zoneId) ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ zoneId: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { zoneId } = await params;
  if (!UUID_RE.test(zoneId)) {
    return NextResponse.json({ error: 'Invalid zone id' }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }
  if (
    parsed.data.estimatedResponseMinutesMin !== undefined &&
    parsed.data.estimatedResponseMinutesMax !== undefined &&
    parsed.data.estimatedResponseMinutesMax < parsed.data.estimatedResponseMinutesMin
  ) {
    return NextResponse.json(
      { error: 'estimatedResponseMinutesMax must be >= estimatedResponseMinutesMin' },
      { status: 400 },
    );
  }

  const before = await findZone(zoneId);
  if (!before) {
    return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
  }

  try {
    const next = parsed.data.slug
      ? { ...parsed.data, slug: parsed.data.slug.toLowerCase() }
      : parsed.data;
    const updated = await updateCoverageZone(zoneId, next as Parameters<typeof updateCoverageZone>[1]);
    if (!updated) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }
    await writeAuditLogSafe({
      actorType: 'admin',
      action: 'coverage_zone.updated',
      entityType: 'coverage_zone',
      entityId: zoneId,
      actorAdminId: admin.adminId,
      actorLabel: admin.email,
      before: before as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      metadata: { slug: updated.slug, fields: Object.keys(next) },
    });
    return NextResponse.json({ zone: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update coverage zone';
    if (/duplicate|unique/i.test(message)) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ zoneId: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { zoneId } = await params;
  if (!UUID_RE.test(zoneId)) {
    return NextResponse.json({ error: 'Invalid zone id' }, { status: 400 });
  }
  const before = await findZone(zoneId);
  if (!before) {
    return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
  }

  const ok = await deleteCoverageZone(zoneId);
  if (!ok) {
    return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
  }
  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'coverage_zone.deleted',
    entityType: 'coverage_zone',
    entityId: zoneId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    before: before as unknown as Record<string, unknown>,
    after: null,
    metadata: { slug: before.slug },
  });
  return NextResponse.json({ ok: true });
}
