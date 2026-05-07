/**
 * PATCH /api/admin/action-queue/items/[id]/review
 *
 * Closes a persistent action queue item: sets status to REVIEWED or
 * DISMISSED, stamps reviewedAt + reviewedBy, and records an optional
 * internal note.
 *
 * 404 — item not found.
 * 409 — item already closed (status !== OPEN).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  resolution: z.enum(['REVIEWED', 'DISMISSED']),
  note: z.string().trim().min(1).max(2000).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { id } = await params;
  const idParse = z.string().uuid().safeParse(id);
  if (!idParse.success) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
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
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await db
    .select({
      id: schema.actionQueueItems.id,
      status: schema.actionQueueItems.status,
    })
    .from(schema.actionQueueItems)
    .where(eq(schema.actionQueueItems.id, idParse.data))
    .limit(1);

  const row = existing[0];
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (row.status !== 'OPEN') {
    return NextResponse.json(
      { error: 'Already closed', code: 'already_closed', status: row.status },
      { status: 409 },
    );
  }

  const now = new Date();
  await db
    .update(schema.actionQueueItems)
    .set({
      status: parsed.data.resolution,
      reviewedAt: now,
      reviewedBy: admin.adminId,
      reviewNote: parsed.data.note ?? null,
      updatedAt: now,
    })
    .where(eq(schema.actionQueueItems.id, idParse.data));

  return NextResponse.json({
    id: idParse.data,
    status: parsed.data.resolution,
    reviewedAt: now.toISOString(),
  });
}
