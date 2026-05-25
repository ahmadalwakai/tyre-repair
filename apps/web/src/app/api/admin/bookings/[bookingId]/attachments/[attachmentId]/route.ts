/**
 * Admin Stability & Field Operations Pack — Part 3
 * DELETE /api/admin/bookings/[bookingId]/attachments/[attachmentId]
 *
 * Owner/admin only (booking.attachments.delete permission).
 * Removes the database record. Object storage cleanup is the responsibility
 * of a future background job; we only delete metadata here so that admin
 * lists stop showing the photo.
 */
import { NextResponse } from 'next/server';
import { db, schema, eq, and } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { permissionErrorResponse, requirePermission } from '@/lib/admin/permissions';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ bookingId: string; attachmentId: string }>;
}

export async function DELETE(req: Request, context: RouteContext): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  try {
    requirePermission(admin, 'booking.attachments.delete');
  } catch (err) {
    const res = permissionErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const { bookingId, attachmentId } = await context.params;
  if (!bookingId || !attachmentId) {
    return NextResponse.json({ error: 'Invalid identifiers' }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(schema.bookingAttachments)
    .where(
      and(
        eq(schema.bookingAttachments.id, attachmentId),
        eq(schema.bookingAttachments.bookingId, bookingId),
      ),
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  }

  await db
    .delete(schema.bookingAttachments)
    .where(eq(schema.bookingAttachments.id, attachmentId));

  await writeAuditLogSafe({
    actorType: 'admin',
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    action: 'booking.attachment.deleted',
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    before: {
      attachmentId: existing.id,
      type: existing.type,
      fileKey: existing.fileKey,
    },
  });

  return NextResponse.json({ ok: true });
}
