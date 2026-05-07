import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();
const updateSchema = z.object({
  body: z.string().trim().min(1).max(1000).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ noteId: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const { noteId } = await context.params;
  if (!idSchema.safeParse(noteId).success) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success || (parsed.data.body === undefined && parsed.data.archived === undefined)) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const values: Partial<typeof schema.customerRiskNotes.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.body !== undefined) values.body = parsed.data.body;
  if (parsed.data.archived !== undefined) {
    values.archivedAt = parsed.data.archived ? new Date() : null;
  }

  const updated = await db
    .update(schema.customerRiskNotes)
    .set(values)
    .where(eq(schema.customerRiskNotes.id, noteId))
    .returning({ id: schema.customerRiskNotes.id });
  if (!updated[0]) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }
  await writeAuditLogSafe({
    actorType: 'admin',
    action: parsed.data.archived ? 'customer.risk_note.archived' : 'customer.risk_note.updated',
    entityType: 'system',
    entityId: noteId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: { noteId, fields: Object.keys(parsed.data) },
  });
  return NextResponse.json({ success: true });
}
