import { NextResponse } from 'next/server';
import { requireAdmin, AdminAuthError } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  // Best-effort: log who logged out. Token may be expired; ignore auth errors.
  try {
    const ctx = await requireAdmin(req);
    await writeAuditLogSafe({
      actorType: 'admin',
      action: 'admin.logout',
      entityType: 'auth',
      actorAdminId: ctx.adminId,
      actorLabel: ctx.email,
    });
  } catch (err) {
    if (!(err instanceof AdminAuthError)) {
      // unexpected — still respond OK so client clears token
    }
  }
  return NextResponse.json({ success: true });
}
