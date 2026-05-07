import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@tyrerepair/db';
import { ADMIN_CHANNEL, triggerRealtimeEvent } from '@tyrerepair/realtime';
import type { CallbackRequestedPayload, RealtimeEvent } from '@tyrerepair/realtime';
import { safeSendAdminNotification } from '@/lib/notifications/send-admin-notification';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const tyreProblemTypes = [
  'PUNCTURE_OR_FLAT',
  'DAMAGED_OR_BLOWN_OUT',
  'SLOW_PRESSURE_LOSS',
  'NEEDS_REPLACEMENT',
  'NOT_SURE',
] as const;

const bodySchema = z.object({
  fullName: z.string().trim().min(1).max(160).optional(),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone is required')
    .max(32, 'Phone too long'),
  email: z.string().trim().email().max(320).optional().or(z.literal('').transform(() => undefined)),
  tyreProblemType: z.enum(tyreProblemTypes).optional(),
  message: z.string().trim().max(2000).optional(),
  sourcePage: z.string().trim().max(160).optional(),
  source: z.string().trim().max(40).optional(),
  locationLabel: z.string().trim().max(240).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

interface SuccessResponse {
  success: true;
  callbackRequestId: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

export async function POST(req: Request): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'invalid_body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'invalid_input' },
      { status: 400 },
    );
  }
  const input = parsed.data;

  let inserted: { id: string; createdAt: Date } | undefined;
  try {
    const rows = await db
      .insert(schema.callbackRequests)
      .values({
        fullName: input.fullName ?? null,
        phone: input.phone,
        email: input.email ?? null,
        tyreProblemType: input.tyreProblemType ?? null,
        message: input.message ?? null,
        sourcePage: input.sourcePage ?? null,
        source: input.source ?? null,
        locationLabel: input.locationLabel ?? null,
        ...(input.latitude != null ? { latitude: String(input.latitude) } : {}),
        ...(input.longitude != null ? { longitude: String(input.longitude) } : {}),
      })
      .returning({ id: schema.callbackRequests.id, createdAt: schema.callbackRequests.createdAt });
    inserted = rows[0];
  } catch {
    return NextResponse.json(
      { error: 'Could not save your request. Please call us instead.', code: 'db_error' },
      { status: 500 },
    );
  }

  if (!inserted) {
    return NextResponse.json(
      { error: 'Could not save your request', code: 'db_error' },
      { status: 500 },
    );
  }

  const payload: CallbackRequestedPayload = {
    callbackRequestId: inserted.id,
    fullName: input.fullName ?? null,
    phone: input.phone,
    tyreProblemType: input.tyreProblemType ?? null,
    sourcePage: input.sourcePage ?? null,
    createdAt: inserted.createdAt.toISOString(),
  };
  const event: RealtimeEvent = {
    type: 'callback.requested',
    payload,
    createdAt: new Date().toISOString(),
  };
  try {
    await triggerRealtimeEvent(ADMIN_CHANNEL, event);
  } catch {
    // never fail the request because realtime is unconfigured
  }
  await safeSendAdminNotification(event);

  await writeAuditLogSafe({
    actorType: 'customer',
    action: 'callback_request.created',
    entityType: 'callback_request',
    entityId: inserted.id,
    callbackRequestId: inserted.id,
    metadata: {
      sourcePage: input.sourcePage ?? null,
      tyreProblemType: input.tyreProblemType ?? null,
    },
  });

  return NextResponse.json({ success: true, callbackRequestId: inserted.id }, { status: 201 });
}
