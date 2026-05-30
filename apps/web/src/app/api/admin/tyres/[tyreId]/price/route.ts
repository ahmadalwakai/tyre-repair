import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  basePriceGbp: z.number().positive().max(10_000).multipleOf(0.01),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ tyreId: string }> },
): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { tyreId } = await context.params;
  if (!z.string().uuid().safeParse(tyreId).success) {
    return NextResponse.json({ error: 'Invalid tyreId' }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid price', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  let current;
  try {
    const rows = await db
      .select({
        id: schema.tyreCatalog.id,
        sku: schema.tyreCatalog.sku,
        basePriceGbp: schema.tyreCatalog.basePriceGbp,
      })
      .from(schema.tyreCatalog)
      .where(eq(schema.tyreCatalog.id, tyreId))
      .limit(1);
    current = rows[0];
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: 'Tyre not found' }, { status: 404 });
  }

  const newPrice = parsed.data.basePriceGbp;
  const previous = Number(current.basePriceGbp);
  if (Math.abs(previous - newPrice) < 0.005) {
    return NextResponse.json({
      success: true,
      tyreId,
      basePriceGbp: previous,
      unchanged: true,
    });
  }

  try {
    await db
      .update(schema.tyreCatalog)
      .set({ basePriceGbp: newPrice.toFixed(2), updatedAt: new Date() })
      .where(eq(schema.tyreCatalog.id, tyreId));
  } catch {
    return NextResponse.json({ error: 'Could not update price' }, { status: 500 });
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'tyre.price.updated.by_admin',
    entityType: 'tyre_catalog',
    entityId: tyreId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    before: { basePriceGbp: previous },
    after: { basePriceGbp: newPrice },
    metadata: { sku: current.sku },
  });

  return NextResponse.json({
    success: true,
    tyreId,
    basePriceGbp: newPrice,
  });
}
