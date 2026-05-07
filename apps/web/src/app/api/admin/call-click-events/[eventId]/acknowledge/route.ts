import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { CALL_CLICK_HANDLED_ACTIONS, type CallClickHandledAction } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  action: z.enum(
    CALL_CLICK_HANDLED_ACTIONS as readonly [CallClickHandledAction, ...CallClickHandledAction[]],
  ),
});

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

export async function PATCH(req: Request, ctx: RouteContext): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { eventId } = await ctx.params;
  if (!eventId || typeof eventId !== 'string') {
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
  }
  const idCheck = z.string().uuid().safeParse(eventId);
  if (!idCheck.success) {
    return NextResponse.json({ error: 'Invalid eventId' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const action: CallClickHandledAction = parsed.data.action;

  const existingRows = await db
    .select({
      id: schema.callClickEvents.id,
      acknowledgedAt: schema.callClickEvents.acknowledgedAt,
      handledAt: schema.callClickEvents.handledAt,
      handledAction: schema.callClickEvents.handledAction,
    })
    .from(schema.callClickEvents)
    .where(eq(schema.callClickEvents.id, eventId))
    .limit(1);
  const existing = existingRows[0];
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const now = new Date();
  const updateSet: {
    acknowledgedAt: Date;
    handledAt: Date;
    handledByAdminId: string;
    handledAction: CallClickHandledAction;
    acknowledgedByAdminId?: string;
  } = {
    acknowledgedAt: existing.acknowledgedAt ?? now,
    handledAt: now,
    handledByAdminId: admin.adminId,
    handledAction: action,
  };
  if (!existing.acknowledgedAt) {
    updateSet.acknowledgedByAdminId = admin.adminId;
  }
  const updated = await db
    .update(schema.callClickEvents)
    .set(updateSet)
    .where(eq(schema.callClickEvents.id, eventId))
    .returning({
      id: schema.callClickEvents.id,
      handledAt: schema.callClickEvents.handledAt,
      handledAction: schema.callClickEvents.handledAction,
      acknowledgedAt: schema.callClickEvents.acknowledgedAt,
    });

  const row = updated[0];
  if (!row) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  void writeAuditLogSafe({
    actorType: 'admin',
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    action: 'lead.call_click.acknowledged',
    entityType: 'lead',
    entityId: row.id,
    metadata: { handledAction: action },
  });

  return NextResponse.json({
    id: row.id,
    acknowledgedAt: row.acknowledgedAt ? row.acknowledgedAt.toISOString() : null,
    handledAt: row.handledAt ? row.handledAt.toISOString() : null,
    handledAction: row.handledAction,
  });
}
