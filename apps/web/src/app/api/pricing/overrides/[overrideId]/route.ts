import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  PRICING_CHANNEL,
  triggerRealtimeEvent,
  type PricingOverrideStatus,
  type PricingOverrideType,
  type PricingOverrideUpdatedPayload,
} from '@tyrerepair/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const statusSchema = z.enum(['active', 'inactive', 'expired']);

const patchSchema = z.object({
  status: statusSchema.optional(),
  label: z.string().min(2).max(160).optional(),
  multiplier: z.number().positive().max(100).optional(),
  reason: z.string().max(2000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

function checkAdminAuth(req: Request): NextResponse | null {
  const provided = req.headers.get('x-admin-dev-secret');
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || !provided || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

interface UpdateValues {
  status?: PricingOverrideStatus;
  label?: string;
  multiplier?: string;
  reason?: string | null;
  expiresAt?: Date | null;
  updatedAt: Date;
}

async function emitUpdated(
  overrideId: string,
  type: PricingOverrideType,
  status: PricingOverrideStatus,
  multiplier: string,
  label: string,
  updatedAt: Date,
): Promise<void> {
  const payload: PricingOverrideUpdatedPayload = {
    overrideId,
    type,
    status,
    multiplier,
    label,
    updatedAt: updatedAt.toISOString(),
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
    // Pusher unconfigured in dev
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ overrideId: string }> },
): Promise<NextResponse> {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const { overrideId } = await context.params;
  if (!z.string().uuid().safeParse(overrideId).success) {
    return NextResponse.json({ error: 'Invalid overrideId' }, { status: 400 });
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
      { error: 'Invalid override patch', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const updatedAt = new Date();
  const values: UpdateValues = { updatedAt };
  if (d.status) values.status = d.status;
  if (d.label) values.label = d.label;
  if (typeof d.multiplier === 'number') values.multiplier = d.multiplier.toFixed(4);
  if (d.reason !== undefined) values.reason = d.reason;
  if (d.expiresAt !== undefined) values.expiresAt = d.expiresAt ? new Date(d.expiresAt) : null;

  try {
    const updated = await db
      .update(schema.pricingOverrides)
      .set(values)
      .where(eq(schema.pricingOverrides.id, overrideId))
      .returning({
        id: schema.pricingOverrides.id,
        type: schema.pricingOverrides.type,
        status: schema.pricingOverrides.status,
        multiplier: schema.pricingOverrides.multiplier,
        label: schema.pricingOverrides.label,
        updatedAt: schema.pricingOverrides.updatedAt,
      });
    const row = updated[0];
    if (!row) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }
    await emitUpdated(
      row.id,
      row.type as PricingOverrideType,
      row.status as PricingOverrideStatus,
      row.multiplier,
      row.label,
      row.updatedAt,
    );
    return NextResponse.json({ success: true, overrideId: row.id });
  } catch {
    return NextResponse.json({ error: 'Could not update override' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ overrideId: string }> },
): Promise<NextResponse> {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const { overrideId } = await context.params;
  if (!z.string().uuid().safeParse(overrideId).success) {
    return NextResponse.json({ error: 'Invalid overrideId' }, { status: 400 });
  }

  const updatedAt = new Date();
  try {
    const updated = await db
      .update(schema.pricingOverrides)
      .set({ status: 'inactive', updatedAt })
      .where(eq(schema.pricingOverrides.id, overrideId))
      .returning({
        id: schema.pricingOverrides.id,
        type: schema.pricingOverrides.type,
        status: schema.pricingOverrides.status,
        multiplier: schema.pricingOverrides.multiplier,
        label: schema.pricingOverrides.label,
        updatedAt: schema.pricingOverrides.updatedAt,
      });
    const row = updated[0];
    if (!row) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }
    await emitUpdated(
      row.id,
      row.type as PricingOverrideType,
      row.status as PricingOverrideStatus,
      row.multiplier,
      row.label,
      row.updatedAt,
    );
    return NextResponse.json({ success: true, overrideId: row.id });
  } catch {
    return NextResponse.json({ error: 'Could not delete override' }, { status: 500 });
  }
}
