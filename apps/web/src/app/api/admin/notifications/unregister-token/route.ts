import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { deactivateAdminPushToken } from '@/lib/notifications/push-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  expoPushToken: z.string().trim().min(10).max(255),
});

export async function POST(req: Request): Promise<NextResponse> {
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
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  try {
    await deactivateAdminPushToken({
      adminId: admin.adminId,
      expoPushToken: parsed.data.expoPushToken,
    });
  } catch {
    // best-effort
  }
  return NextResponse.json({ success: true });
}
