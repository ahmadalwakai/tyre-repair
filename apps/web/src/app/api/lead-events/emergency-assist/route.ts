import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@tyrerepair/db';
import {
  ADMIN_CHANNEL,
  triggerRealtimeEvent,
  type EmergencyAssistCreatedPayload,
  type RealtimeEvent,
} from '@tyrerepair/realtime';
import { safeSendAdminNotification } from '@/lib/notifications/send-admin-notification';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROBLEM_TYPES = [
  'PUNCTURE_OR_FLAT',
  'DAMAGED_OR_BLOWN_OUT',
  'SLOW_PRESSURE_LOSS',
  'NEEDS_REPLACEMENT',
  'NOT_SURE',
] as const;

const JOB_TYPES = ['ASSESSMENT', 'REPLACEMENT'] as const;

const bodySchema = z.object({
  anonymousSessionId: z.string().trim().max(160).optional(),
  quoteProgressId: z.string().trim().max(160).optional(),
  vehicleRegistration: z.string().trim().max(32).optional(),
  tyreProblemType: z.enum(PROBLEM_TYPES).optional(),
  jobType: z.enum(JOB_TYPES).optional(),
  customerPhone: z.string().trim().min(7).max(32).optional(),
  customerName: z.string().trim().max(160).optional(),
  locationLabel: z.string().trim().max(240).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  source: z.string().trim().max(64).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = (await req.json()) as unknown;
    parsed = bodySchema.parse(json ?? {});
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const userAgent = req.headers.get('user-agent') ?? null;
  const referrer = req.headers.get('referer') ?? req.headers.get('referrer') ?? null;

  let row: { id: string; createdAt: Date };
  try {
    const inserted = await db
      .insert(schema.emergencyAssistEvents)
      .values({
        anonymousSessionId: parsed.anonymousSessionId ?? null,
        quoteProgressId: parsed.quoteProgressId ?? null,
        source: parsed.source ?? 'QUOTE_EMERGENCY_BUTTON',
        page: '/quote',
        status: 'NEW',
        vehicleRegistration: parsed.vehicleRegistration ?? null,
        tyreProblemType: parsed.tyreProblemType ?? null,
        jobType: parsed.jobType ?? null,
        customerPhone: parsed.customerPhone ?? null,
        locationLabel: parsed.locationLabel ?? null,
        latitude: parsed.latitude != null ? String(parsed.latitude) : null,
        longitude: parsed.longitude != null ? String(parsed.longitude) : null,
        userAgent,
        referrer,
        metadata: parsed.customerName ? { customerName: parsed.customerName } : {},
      })
      .returning({ id: schema.emergencyAssistEvents.id, createdAt: schema.emergencyAssistEvents.createdAt });
    const first = inserted[0];
    if (!first) throw new Error('insert returned no row');
    row = first;
  } catch (err: unknown) {
    console.error('[emergency_assist] insert failed', err);
    return NextResponse.json({ ok: false, error: 'Could not record request' }, { status: 500 });
  }

  const payload: EmergencyAssistCreatedPayload = {
    eventId: row.id,
    source: parsed.source ?? 'QUOTE_EMERGENCY_BUTTON',
    page: '/quote',
    status: 'NEW',
    message: 'Emergency assist started from quote page',
    priority: 'HIGH',
    vehicleRegistration: parsed.vehicleRegistration ?? null,
    customerPhone: parsed.customerPhone ?? null,
    customerName: parsed.customerName ?? null,
    locationLabel: parsed.locationLabel ?? null,
    tyreProblemType: parsed.tyreProblemType ?? null,
    jobType: parsed.jobType ?? null,
    createdAt: row.createdAt.toISOString(),
  };

  const event: RealtimeEvent = {
    type: 'emergency_assist.created',
    payload,
    createdAt: row.createdAt.toISOString(),
  };

  void triggerRealtimeEvent(ADMIN_CHANNEL, event).catch((e: unknown) => {
    console.error('[emergency_assist] realtime publish failed', e);
  });
  void safeSendAdminNotification(event).catch((e: unknown) => {
    console.error('[emergency_assist] admin push notification failed', e);
  });
  void writeAuditLogSafe({
    actorType: 'customer',
    action: 'emergency_assist.created',
    entityType: 'lead',
    entityId: row.id,
    metadata: {
      source: parsed.source ?? 'QUOTE_EMERGENCY_BUTTON',
      hasPhone: !!parsed.customerPhone,
      hasLocation: !!(parsed.latitude && parsed.longitude),
    },
  });

  return NextResponse.json(
    {
      ok: true,
      eventId: row.id,
      status: 'NEW' as const,
      message: 'Emergency assist flagged',
    },
    { status: 201 },
  );
}
