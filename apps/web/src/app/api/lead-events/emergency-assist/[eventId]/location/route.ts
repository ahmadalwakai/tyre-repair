import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  triggerRealtimeEvent,
  type EmergencyAssistLocationConfidence,
  type EmergencyAssistLocationUpdatedPayload,
  type RealtimeEvent,
} from '@tyrerepair/realtime';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOCATION_CONFIDENCE = [
  'CONFIRMED_ADDRESS',
  'GPS_ONLY',
  'WEAK_ADDRESS',
  'MISSING_LOCATION',
] as const satisfies readonly EmergencyAssistLocationConfidence[];

const bodySchema = z.object({
  locationLabel: z.string().trim().max(240).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  locationConfidence: z.enum(LOCATION_CONFIDENCE),
});

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

export async function PATCH(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const { eventId } = await ctx.params;
  if (!eventId || typeof eventId !== 'string') {
    return NextResponse.json({ ok: false, error: 'Invalid eventId' }, { status: 400 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = (await req.json()) as unknown;
    parsed = bodySchema.parse(json ?? {});
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  let existing: { id: string } | undefined;
  try {
    const rows = await db
      .select({ id: schema.emergencyAssistEvents.id })
      .from(schema.emergencyAssistEvents)
      .where(eq(schema.emergencyAssistEvents.id, eventId))
      .limit(1);
    existing = rows[0];
  } catch {
    return NextResponse.json({ ok: false, error: 'Lookup failed' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const now = new Date();
  try {
    await db
      .update(schema.emergencyAssistEvents)
      .set({
        locationLabel: parsed.locationLabel ?? null,
        latitude: parsed.latitude != null ? String(parsed.latitude) : null,
        longitude: parsed.longitude != null ? String(parsed.longitude) : null,
        locationConfidence: parsed.locationConfidence,
        status: 'CONTINUED_TO_LOCATION',
        updatedAt: now,
      })
      .where(eq(schema.emergencyAssistEvents.id, eventId));
  } catch {
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 500 });
  }

  const payload: EmergencyAssistLocationUpdatedPayload = {
    eventId,
    status: 'CONTINUED_TO_LOCATION',
    locationLabel: parsed.locationLabel ?? null,
    latitude: parsed.latitude ?? null,
    longitude: parsed.longitude ?? null,
    locationConfidence: parsed.locationConfidence,
    updatedAt: now.toISOString(),
  };
  const event: RealtimeEvent = {
    type: 'emergency_assist.location_updated',
    payload,
    createdAt: now.toISOString(),
  };

  void triggerRealtimeEvent(ADMIN_CHANNEL, event).catch(() => {});
  void writeAuditLogSafe({
    actorType: 'customer',
    action: 'emergency_assist.created',
    entityType: 'lead',
    entityId: eventId,
    metadata: {
      kind: 'location_updated',
      locationConfidence: parsed.locationConfidence,
      hasCoords: parsed.latitude != null && parsed.longitude != null,
    },
  });

  return NextResponse.json({ ok: true, eventId, status: 'CONTINUED_TO_LOCATION' as const });
}
