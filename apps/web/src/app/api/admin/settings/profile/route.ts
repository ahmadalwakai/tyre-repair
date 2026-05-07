import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
});

export async function GET(req: Request): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  return NextResponse.json({
    profile: { id: admin.adminId, email: admin.email, fullName: admin.fullName, role: admin.role },
  });
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
    return NextResponse.json({ error: 'Invalid profile update', issues: parsed.error.issues }, { status: 400 });
  }
  try {
    await db
      .update(schema.admins)
      .set({ fullName: parsed.data.fullName, updatedAt: new Date() })
      .where(eq(schema.admins.id, admin.adminId));
  } catch {
    return NextResponse.json({ error: 'Could not update profile' }, { status: 500 });
  }
  return NextResponse.json({
    profile: {
      id: admin.adminId,
      email: admin.email,
      fullName: parsed.data.fullName,
      role: admin.role,
    },
  });
}
