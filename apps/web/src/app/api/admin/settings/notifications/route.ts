import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  pushEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  bookingAlertsEnabled: z.boolean().optional(),
  stockAlertsEnabled: z.boolean().optional(),
  pricingAlertsEnabled: z.boolean().optional(),
  visitorAlertsEnabled: z.boolean().optional(),
});

interface PrefRow {
  pushEnabled: boolean;
  soundEnabled: boolean;
  bookingAlertsEnabled: boolean;
  stockAlertsEnabled: boolean;
  pricingAlertsEnabled: boolean;
  visitorAlertsEnabled: boolean;
}

async function readOrCreate(adminId: string): Promise<PrefRow> {
  const rows = await db
    .select({
      pushEnabled: schema.notificationPreferences.pushEnabled,
      soundEnabled: schema.notificationPreferences.soundEnabled,
      bookingAlertsEnabled: schema.notificationPreferences.bookingAlertsEnabled,
      stockAlertsEnabled: schema.notificationPreferences.stockAlertsEnabled,
      pricingAlertsEnabled: schema.notificationPreferences.pricingAlertsEnabled,
      visitorAlertsEnabled: schema.notificationPreferences.visitorAlertsEnabled,
    })
    .from(schema.notificationPreferences)
    .where(eq(schema.notificationPreferences.adminId, adminId))
    .limit(1);
  const row = rows[0];
  if (row) return row;
  const inserted = await db
    .insert(schema.notificationPreferences)
    .values({ adminId })
    .returning({
      pushEnabled: schema.notificationPreferences.pushEnabled,
      soundEnabled: schema.notificationPreferences.soundEnabled,
      bookingAlertsEnabled: schema.notificationPreferences.bookingAlertsEnabled,
      stockAlertsEnabled: schema.notificationPreferences.stockAlertsEnabled,
      pricingAlertsEnabled: schema.notificationPreferences.pricingAlertsEnabled,
      visitorAlertsEnabled: schema.notificationPreferences.visitorAlertsEnabled,
    });
  const created = inserted[0];
  if (!created) throw new Error('Could not create preferences');
  return created;
}

export async function GET(req: Request): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  try {
    const prefs = await readOrCreate(admin.adminId);
    return NextResponse.json({ preferences: prefs });
  } catch {
    return NextResponse.json({ error: 'Could not load preferences' }, { status: 500 });
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

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid preferences', issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of [
    'pushEnabled',
    'soundEnabled',
    'bookingAlertsEnabled',
    'stockAlertsEnabled',
    'pricingAlertsEnabled',
    'visitorAlertsEnabled',
  ] as const) {
    const v = d[k];
    if (typeof v === 'boolean') updates[k] = v;
  }

  try {
    // ensure row exists
    await readOrCreate(admin.adminId);
    await db
      .update(schema.notificationPreferences)
      .set(updates)
      .where(eq(schema.notificationPreferences.adminId, admin.adminId));
    const prefs = await readOrCreate(admin.adminId);
    return NextResponse.json({ preferences: prefs });
  } catch {
    return NextResponse.json({ error: 'Could not save preferences' }, { status: 500 });
  }
}
