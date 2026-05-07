import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { upsertAdminPushToken } from '@/lib/notifications/push-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  expoPushToken: z.string().trim().min(10).max(255),
  platform: z.literal('android'),
  deviceName: z.string().trim().max(160).optional(),
  appVersion: z.string().trim().max(40).optional(),
  nativeBuildVersion: z.string().trim().max(40).optional(),
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
    return NextResponse.json(
      { error: 'Invalid push token registration', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const { tokenId } = await upsertAdminPushToken({
      adminId: admin.adminId,
      expoPushToken: parsed.data.expoPushToken,
      platform: 'android',
      deviceName: parsed.data.deviceName ?? null,
    });
    return NextResponse.json({ success: true, tokenId });
  } catch {
    return NextResponse.json({ error: 'Could not register push token' }, { status: 500 });
  }
}
