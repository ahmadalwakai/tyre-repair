import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, sql } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();

export async function POST(
  req: Request,
  context: { params: Promise<{ notificationId: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const { notificationId } = await context.params;
  if (!idSchema.safeParse(notificationId).success) {
    return NextResponse.json({ error: 'Invalid notificationId' }, { status: 400 });
  }
  const updated = await db
    .update(schema.adminNotifications)
    .set({ readAt: sql`now()` })
    .where(eq(schema.adminNotifications.id, notificationId))
    .returning({ id: schema.adminNotifications.id, type: schema.adminNotifications.type });
  const row = updated[0];
  if (!row) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }
  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'notification.inbox.marked_read',
    entityType: 'notification',
    entityId: row.id,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: { type: row.type },
  });
  return NextResponse.json({ success: true });
}
