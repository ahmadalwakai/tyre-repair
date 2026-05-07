import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, and } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();

const updateSchema = z
  .object({
    body: z.string().trim().min(1).max(2000).optional(),
    pinned: z.boolean().optional(),
  })
  .refine((v) => v.body !== undefined || v.pinned !== undefined, {
    message: 'Nothing to update',
  });

export async function PATCH(
  req: Request,
  context: { params: Promise<{ bookingId: string; noteId: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const { bookingId, noteId } = await context.params;
  if (!idSchema.safeParse(bookingId).success || !idSchema.safeParse(noteId).success) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const updateValues: Partial<typeof schema.bookingInternalNotes.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.body !== undefined) updateValues.body = parsed.data.body;
  if (parsed.data.pinned !== undefined) updateValues.pinned = parsed.data.pinned;

  const updated = await db
    .update(schema.bookingInternalNotes)
    .set(updateValues)
    .where(
      and(
        eq(schema.bookingInternalNotes.id, noteId),
        eq(schema.bookingInternalNotes.bookingId, bookingId),
      ),
    )
    .returning({ id: schema.bookingInternalNotes.id });
  if (!updated[0]) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }
  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'booking.note.updated',
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: { noteId, fields: Object.keys(parsed.data) },
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ bookingId: string; noteId: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const { bookingId, noteId } = await context.params;
  if (!idSchema.safeParse(bookingId).success || !idSchema.safeParse(noteId).success) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  // Soft delete
  const updated = await db
    .update(schema.bookingInternalNotes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.bookingInternalNotes.id, noteId),
        eq(schema.bookingInternalNotes.bookingId, bookingId),
      ),
    )
    .returning({ id: schema.bookingInternalNotes.id });
  if (!updated[0]) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }
  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'booking.note.deleted',
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: { noteId },
  });
  return NextResponse.json({ success: true });
}
