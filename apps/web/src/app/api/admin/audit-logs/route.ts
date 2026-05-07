import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, and, eq, gte, lte, lt, desc, type SQL } from '@tyrerepair/db';
import {
  adminAuthErrorResponse,
  requireAdmin,
  AdminAuthError,
} from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  bookingId: z.string().uuid().optional(),
  entityType: z.string().min(1).max(80).optional(),
  action: z.string().min(1).max(120).optional(),
  actorAdminId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().datetime().optional(),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      const { status, body } = adminAuthErrorResponse(err);
      return NextResponse.json(body, { status });
    }
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const q = parsed.data;

  const conditions: SQL[] = [];
  if (q.bookingId) conditions.push(eq(schema.auditLogs.bookingId, q.bookingId));
  if (q.entityType) conditions.push(eq(schema.auditLogs.entityType, q.entityType));
  if (q.action) conditions.push(eq(schema.auditLogs.action, q.action));
  if (q.actorAdminId) conditions.push(eq(schema.auditLogs.actorAdminId, q.actorAdminId));
  if (q.from) conditions.push(gte(schema.auditLogs.createdAt, new Date(q.from)));
  if (q.to) conditions.push(lte(schema.auditLogs.createdAt, new Date(q.to)));
  if (q.cursor) conditions.push(lt(schema.auditLogs.createdAt, new Date(q.cursor)));

  const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: schema.auditLogs.id,
      actorType: schema.auditLogs.actorType,
      actorAdminId: schema.auditLogs.actorAdminId,
      actorLabel: schema.auditLogs.actorLabel,
      action: schema.auditLogs.action,
      entityType: schema.auditLogs.entityType,
      entityId: schema.auditLogs.entityId,
      bookingId: schema.auditLogs.bookingId,
      paymentId: schema.auditLogs.paymentId,
      adjustmentId: schema.auditLogs.adjustmentId,
      stockId: schema.auditLogs.stockId,
      callbackRequestId: schema.auditLogs.callbackRequestId,
      before: schema.auditLogs.before,
      after: schema.auditLogs.after,
      metadata: schema.auditLogs.metadata,
      createdAt: schema.auditLogs.createdAt,
    })
    .from(schema.auditLogs)
    .where(whereExpr ?? undefined)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(q.limit + 1);

  const hasMore = rows.length > q.limit;
  const items = (hasMore ? rows.slice(0, q.limit) : rows).map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
  const nextCursor =
    hasMore && items.length > 0 ? items[items.length - 1]!.createdAt : null;

  return NextResponse.json({
    items,
    nextCursor,
    hasMore,
  });
}
