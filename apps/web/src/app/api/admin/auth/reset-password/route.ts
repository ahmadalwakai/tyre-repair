import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db, schema, eq, and, gt, isNotNull } from '@tyrerepair/db';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schemaIn = z.object({
  token: z.string().min(16).max(256),
  newPassword: z.string().min(12).max(200),
});

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(req: Request): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = schemaIn.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const tokenHash = hashToken(parsed.data.token);

  let admin;
  try {
    const rows = await db
      .select({ id: schema.admins.id, isActive: schema.admins.isActive })
      .from(schema.admins)
      .where(
        and(
          eq(schema.admins.passwordResetTokenHash, tokenHash),
          isNotNull(schema.admins.passwordResetExpiresAt),
          gt(schema.admins.passwordResetExpiresAt, new Date()),
        ),
      )
      .limit(1);
    admin = rows[0];
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  if (!admin || !admin.isActive) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  let passwordHash: string;
  try {
    passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  try {
    await db
      .update(schema.admins)
      .set({
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.admins.id, admin.id));
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'admin.password_reset.completed',
    entityType: 'auth',
    actorAdminId: admin.id,
  });

  return NextResponse.json({ success: true });
}
