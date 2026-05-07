import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db, schema, eq, and } from '@tyrerepair/db';
import { signAdminToken } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(200),
});

interface LoginSuccessResponse {
  token: string;
  admin: {
    id: string;
    email: string;
    fullName: string;
    role: 'owner' | 'admin';
  };
}

export async function POST(req: Request): Promise<NextResponse<LoginSuccessResponse | { error: string }>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
  }
  const { email, password } = parsed.data;

  let admin;
  try {
    const rows = await db
      .select({
        id: schema.admins.id,
        email: schema.admins.email,
        fullName: schema.admins.fullName,
        role: schema.admins.role,
        isActive: schema.admins.isActive,
        passwordHash: schema.admins.passwordHash,
      })
      .from(schema.admins)
      .where(and(eq(schema.admins.email, email)))
      .limit(1);
    admin = rows[0];
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  if (!admin) {
    await writeAuditLogSafe({
      actorType: 'system',
      action: 'admin.login.failed',
      entityType: 'auth',
      actorLabel: email,
      metadata: { reason: 'unknown_email' },
    });
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  if (!admin.isActive) {
    await writeAuditLogSafe({
      actorType: 'system',
      action: 'admin.login.failed',
      entityType: 'auth',
      actorAdminId: admin.id,
      actorLabel: admin.email,
      metadata: { reason: 'inactive' },
    });
    return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
  }

  let ok = false;
  try {
    ok = await bcrypt.compare(password, admin.passwordHash);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  if (!ok) {
    await writeAuditLogSafe({
      actorType: 'system',
      action: 'admin.login.failed',
      entityType: 'auth',
      actorAdminId: admin.id,
      actorLabel: admin.email,
      metadata: { reason: 'bad_password' },
    });
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  try {
    await db
      .update(schema.admins)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.admins.id, admin.id));
  } catch {
    // non-fatal
  }

  let token: string;
  try {
    token = await signAdminToken({
      adminId: admin.id,
      email: admin.email,
      role: admin.role as 'owner' | 'admin',
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'admin.login.success',
    entityType: 'auth',
    actorAdminId: admin.id,
    actorLabel: admin.email,
    metadata: { role: admin.role },
  });

  return NextResponse.json({
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role as 'owner' | 'admin',
    },
  });
}
