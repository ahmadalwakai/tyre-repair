import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db, schema, eq } from '@tyrerepair/db';
import { siteConfig } from '@/lib/site-config';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schemaIn = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});

const GENERIC_RESPONSE = {
  message: 'If the email is valid, a reset link has been sent.',
};

function readTtlMinutes(): number {
  const raw = process.env.ADMIN_PASSWORD_RESET_TTL_MINUTES;
  const n = raw ? Number(raw) : 30;
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function sendResetEmail(email: string, token: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl;
  const deepLink = `tyrerepairadmin://reset-password?token=${encodeURIComponent(token)}`;
  const fallback = `${baseUrl}/admin-reset?token=${encodeURIComponent(token)}`;
  const html = `
    <p>You requested a password reset for the TyreRepair UK admin app.</p>
    <p>Open the admin app via this link:</p>
    <p><a href="${deepLink}">${deepLink}</a></p>
    <p>If the deep link does not open, paste this token into the admin app reset screen:</p>
    <p><code>${token}</code></p>
    <p>Or visit: <a href="${fallback}">${fallback}</a></p>
    <p>This link expires in ${readTtlMinutes()} minutes. If you did not request this, ignore this email.</p>
  `;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'TyreRepair UK admin password reset',
      html,
    });
  } catch {
    // graceful degradation
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(GENERIC_RESPONSE);
  }
  const parsed = schemaIn.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(GENERIC_RESPONSE);
  }
  const { email } = parsed.data;

  try {
    const rows = await db
      .select({
        id: schema.admins.id,
        email: schema.admins.email,
        isActive: schema.admins.isActive,
      })
      .from(schema.admins)
      .where(eq(schema.admins.email, email))
      .limit(1);
    const admin = rows[0];
    if (admin && admin.isActive) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + readTtlMinutes() * 60_000);
      await db
        .update(schema.admins)
        .set({
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.admins.id, admin.id));
      await sendResetEmail(admin.email, token);
      await writeAuditLogSafe({
        actorType: 'admin',
        action: 'admin.password_reset.requested',
        entityType: 'auth',
        actorAdminId: admin.id,
        actorLabel: admin.email,
      });
    }
  } catch {
    // never reveal
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
