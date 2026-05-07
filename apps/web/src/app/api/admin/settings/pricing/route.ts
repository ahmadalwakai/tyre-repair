/**
 * GET  /api/admin/settings/pricing — read effective pricing thresholds.
 * PATCH /api/admin/settings/pricing — update one or more thresholds.
 *
 * Admin auth required. Writes invalidate the in-process threshold cache so
 * the next quote uses the new numbers without a redeploy. Audit-logged
 * under `pricing.settings.updated` with the diff.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, sql } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import {
  getPricingThresholds,
  invalidatePricingThresholds,
  PRICING_THRESHOLD_DEFAULTS,
} from '@/lib/settings/pricing-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SETTINGS_KEY = 'pricing';

const patchSchema = z
  .object({
    normal_distance_miles: z.number().nonnegative().optional(),
    review_distance_miles: z.number().nonnegative().optional(),
    high_risk_distance_miles: z.number().nonnegative().optional(),
    max_auto_quote_distance_miles: z.number().nonnegative().optional(),
    long_distance_assessment_threshold_miles: z.number().nonnegative().optional(),
    very_long_distance_assessment_threshold_miles: z.number().nonnegative().optional(),
    long_distance_assessment_min_gbp: z.number().nonnegative().optional(),
  })
  .strict();

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const thresholds = await getPricingThresholds();
  return NextResponse.json({
    key: SETTINGS_KEY,
    defaults: PRICING_THRESHOLD_DEFAULTS,
    effective: thresholds,
  });
}

export async function PATCH(req: Request): Promise<NextResponse> {
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
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // Read existing row, merge, write back.
  const existingRows = await db
    .select({ id: schema.appSettings.id, value: schema.appSettings.value })
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, SETTINGS_KEY))
    .limit(1);
  const existing = existingRows[0];
  const before: Record<string, unknown> =
    existing && existing.value !== null && typeof existing.value === 'object'
      ? (existing.value as Record<string, unknown>)
      : {};
  const after: Record<string, unknown> = { ...before, ...parsed.data };

  if (existing) {
    await db
      .update(schema.appSettings)
      .set({ value: after, updatedAt: new Date() })
      .where(eq(schema.appSettings.id, existing.id));
  } else {
    await db.insert(schema.appSettings).values({
      key: SETTINGS_KEY,
      value: after,
      description: 'Pricing thresholds (profit-guard).',
    });
  }

  invalidatePricingThresholds();

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'pricing.settings.updated',
    entityType: 'app_settings',
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: {
      key: SETTINGS_KEY,
      changedKeys: Object.keys(parsed.data),
      before,
      after,
    },
  });

  // Avoid unused-import warning when sql is not referenced inside this body.
  void sql;

  return NextResponse.json({ key: SETTINGS_KEY, effective: await getPricingThresholds() });
}
