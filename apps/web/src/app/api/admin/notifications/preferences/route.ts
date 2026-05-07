import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import {
  getAdminNotificationPreferences,
  upsertAdminNotificationPreferences,
} from '@/lib/notifications/preferences';

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

export async function GET(req: Request): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  try {
    const preferences = await getAdminNotificationPreferences(admin.adminId);
    return NextResponse.json({ preferences });
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
    return NextResponse.json(
      { error: 'Invalid preferences', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  try {
    const cleaned: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed.data)) {
      if (typeof v === 'boolean') cleaned[k] = v;
    }
    const preferences = await upsertAdminNotificationPreferences(admin.adminId, cleaned);
    return NextResponse.json({ preferences });
  } catch {
    return NextResponse.json({ error: 'Could not save preferences' }, { status: 500 });
  }
}
