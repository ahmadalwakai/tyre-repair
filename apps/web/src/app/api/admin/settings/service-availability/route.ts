import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SETTINGS_KEY = 'service_availability';

const MODES = ['NORMAL', 'HIGH_DEMAND', 'CALL_FIRST', 'TEMPORARILY_LIMITED'] as const;

const writeSchema = z.object({
  mode: z.enum(MODES),
});

export interface ServiceAvailabilitySettings {
  mode: (typeof MODES)[number];
  updatedAt: string;
}

const DEFAULTS: ServiceAvailabilitySettings = {
  mode: 'NORMAL',
  updatedAt: new Date(0).toISOString(),
};

export async function readServiceAvailability(): Promise<ServiceAvailabilitySettings> {
  try {
    const rows = await db
      .select({ value: schema.appSettings.value, updatedAt: schema.appSettings.updatedAt })
      .from(schema.appSettings)
      .where(eq(schema.appSettings.key, SETTINGS_KEY))
      .limit(1);
    const r = rows[0];
    if (!r) return DEFAULTS;
    const v = r.value as { mode?: string } | null;
    const mode = (MODES as readonly string[]).includes(v?.mode ?? '')
      ? (v?.mode as (typeof MODES)[number])
      : 'NORMAL';
    return { mode, updatedAt: r.updatedAt.toISOString() };
  } catch {
    return DEFAULTS;
  }
}

export const SERVICE_AVAILABILITY_PUBLIC_COPY: Record<
  (typeof MODES)[number],
  { headline: string; detail: string }
> = {
  NORMAL: {
    headline: 'Service running as normal',
    detail: 'We are accepting bookings as usual.',
  },
  HIGH_DEMAND: {
    headline: 'Demand is high right now',
    detail: 'We are still accepting jobs but please bear with us if we are slower than usual.',
  },
  CALL_FIRST: {
    headline: 'Please call before booking',
    detail: 'Call us first so we can advise on the fastest way to help you today.',
  },
  TEMPORARILY_LIMITED: {
    headline: 'Service temporarily limited',
    detail: 'We are taking a reduced number of jobs. Please call to check availability.',
  },
};

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const settings = await readServiceAvailability();
  return NextResponse.json({ settings });
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
  const parsed = writeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const value = { mode: parsed.data.mode };

  const existing = await db
    .select({ id: schema.appSettings.id })
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, SETTINGS_KEY))
    .limit(1);
  if (existing[0]) {
    await db
      .update(schema.appSettings)
      .set({ value: value as unknown as Record<string, unknown>, updatedAt: new Date() })
      .where(eq(schema.appSettings.key, SETTINGS_KEY));
  } else {
    await db.insert(schema.appSettings).values({
      key: SETTINGS_KEY,
      value: value as unknown as Record<string, unknown>,
      description: 'Public service availability mode',
    });
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'settings.service_availability.updated',
    entityType: 'system',
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    after: value,
  });

  const settings = await readServiceAvailability();
  return NextResponse.json({ settings });
}
