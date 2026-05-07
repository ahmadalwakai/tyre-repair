import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();
const bodySchema = z.object({
  fastFitAvailable: z.boolean(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ stockId: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  const { stockId } = await context.params;
  if (!idSchema.safeParse(stockId).success) {
    return NextResponse.json({ error: 'Invalid stockId' }, { status: 400 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const stockRow = await db
    .select({ tyreId: schema.stock.tyreId })
    .from(schema.stock)
    .where(eq(schema.stock.id, stockId))
    .limit(1);
  const tyreId = stockRow[0]?.tyreId;
  if (!tyreId) {
    return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
  }
  await db
    .update(schema.tyreCatalog)
    .set({ fastFitAvailable: parsed.data.fastFitAvailable, updatedAt: new Date() })
    .where(eq(schema.tyreCatalog.id, tyreId));
  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'stock.fast_fit.updated',
    entityType: 'stock',
    entityId: stockId,
    stockId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: { fastFitAvailable: parsed.data.fastFitAvailable, tyreId },
  });
  return NextResponse.json({ success: true });
}
