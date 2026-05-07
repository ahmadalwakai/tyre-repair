import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  PRICING_CHANNEL,
  triggerRealtimeEvent,
  type PricingRulesUpdatedPayload,
} from '@tyrerepair/realtime';
import { clearPricingRulesCache } from '@/lib/pricing';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { safeSendAdminNotification } from '@/lib/notifications/send-admin-notification';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRICING_RULE_KEYS = [
  'time_night',
  'time_peak_morning',
  'weather_moderate',
  'weather_severe',
  'date_weekend',
  'date_bank_holiday',
  'distance_free_miles',
  'distance_per_mile_gbp',
  'demand_open_jobs_threshold',
  'demand_high_multiplier',
  'vat_rate',
] as const;

const ruleKeySchema = z.enum(PRICING_RULE_KEYS);

const patchSchema = z.object({
  updates: z
    .array(
      z.object({
        key: ruleKeySchema,
        numericValue: z.number().min(0).max(100),
        isActive: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(50),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  try {
    const rows = await db
      .select({
        id: schema.pricingRules.id,
        key: schema.pricingRules.key,
        label: schema.pricingRules.label,
        description: schema.pricingRules.description,
        numericValue: schema.pricingRules.numericValue,
        isMultiplier: schema.pricingRules.isMultiplier,
        isActive: schema.pricingRules.isActive,
        sortOrder: schema.pricingRules.sortOrder,
        updatedAt: schema.pricingRules.updatedAt,
      })
      .from(schema.pricingRules)
      .orderBy(schema.pricingRules.sortOrder);
    return NextResponse.json({
      rules: rows.map((r) => ({
        id: r.id,
        key: r.key,
        label: r.label,
        description: r.description,
        numericValue: Number(r.numericValue),
        isMultiplier: r.isMultiplier,
        isActive: r.isActive,
        sortOrder: r.sortOrder,
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Could not load pricing rules' }, { status: 500 });
  }
}

export async function PATCH(req: Request): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid update payload', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const updatedAt = new Date();
  try {
    for (const u of parsed.data.updates) {
      const values: { numericValue: string; updatedAt: Date; isActive?: boolean } = {
        numericValue: u.numericValue.toFixed(4),
        updatedAt,
      };
      if (typeof u.isActive === 'boolean') values.isActive = u.isActive;
      await db
        .update(schema.pricingRules)
        .set(values)
        .where(eq(schema.pricingRules.key, u.key));
    }
  } catch {
    return NextResponse.json({ error: 'Could not update pricing rules' }, { status: 500 });
  }

  clearPricingRulesCache();

  const payload: PricingRulesUpdatedPayload = {
    changedKeys: parsed.data.updates.map((u) => u.key),
    updatedByAdminId: admin.adminId,
    updatedAt: updatedAt.toISOString(),
  };
  const event = {
    type: 'pricing.rules.updated' as const,
    payload,
    createdAt: updatedAt.toISOString(),
  };
  try {
    await Promise.all([
      triggerRealtimeEvent(PRICING_CHANNEL, event),
      triggerRealtimeEvent(ADMIN_CHANNEL, event),
    ]);
  } catch {
    // pusher unconfigured
  }
  await safeSendAdminNotification(event);

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'pricing.rule.updated',
    entityType: 'pricing_rule',
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    after: { updates: parsed.data.updates },
    metadata: { changedKeys: payload.changedKeys },
  });

  return NextResponse.json({ success: true, changedKeys: payload.changedKeys });
}
