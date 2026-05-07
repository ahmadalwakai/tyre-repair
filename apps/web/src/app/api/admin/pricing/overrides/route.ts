import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, desc } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  PRICING_CHANNEL,
  triggerRealtimeEvent,
  type PricingOverrideUpdatedPayload,
} from '@tyrerepair/realtime';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import { safeSendAdminNotification } from '@/lib/notifications/send-admin-notification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const overrideTypeSchema = z.enum(['surge', 'discount']);

const createSchema = z.object({
  type: overrideTypeSchema,
  label: z.string().min(2).max(160),
  multiplier: z.number().positive().max(100),
  reason: z.string().max(2000).optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
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
        id: schema.pricingOverrides.id,
        type: schema.pricingOverrides.type,
        status: schema.pricingOverrides.status,
        label: schema.pricingOverrides.label,
        multiplier: schema.pricingOverrides.multiplier,
        reason: schema.pricingOverrides.reason,
        startsAt: schema.pricingOverrides.startsAt,
        expiresAt: schema.pricingOverrides.expiresAt,
        createdAt: schema.pricingOverrides.createdAt,
        updatedAt: schema.pricingOverrides.updatedAt,
      })
      .from(schema.pricingOverrides)
      .orderBy(desc(schema.pricingOverrides.createdAt))
      .limit(100);
    return NextResponse.json({
      overrides: rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        label: r.label,
        multiplier: Number(r.multiplier),
        reason: r.reason,
        startsAt: r.startsAt.toISOString(),
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Could not load overrides' }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid override', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const startsAt = d.startsAt ? new Date(d.startsAt) : new Date();
  const expiresAt = d.expiresAt ? new Date(d.expiresAt) : null;

  try {
    const inserted = await db
      .insert(schema.pricingOverrides)
      .values({
        type: d.type,
        status: 'active',
        label: d.label,
        multiplier: d.multiplier.toFixed(4),
        reason: d.reason ?? null,
        startsAt,
        expiresAt,
        createdByAdminId: admin.adminId,
      })
      .returning({
        id: schema.pricingOverrides.id,
        updatedAt: schema.pricingOverrides.updatedAt,
      });
    const created = inserted[0];
    if (!created) {
      return NextResponse.json({ error: 'Could not create override' }, { status: 500 });
    }

    const payload: PricingOverrideUpdatedPayload = {
      overrideId: created.id,
      type: d.type,
      status: 'active',
      multiplier: d.multiplier.toFixed(4),
      label: d.label,
      updatedAt: created.updatedAt.toISOString(),
    };
    const event = {
      type: 'pricing.override.updated' as const,
      payload,
      createdAt: new Date().toISOString(),
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
      action: 'pricing.override.created',
      entityType: 'pricing_override',
      entityId: created.id,
      actorAdminId: admin.adminId,
      actorLabel: admin.email,
      after: { type: d.type, label: d.label, multiplier: d.multiplier.toFixed(4) },
    });

    return NextResponse.json({ success: true, overrideId: created.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Could not create override' }, { status: 500 });
  }
}
