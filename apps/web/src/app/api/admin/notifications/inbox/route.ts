import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq, and, isNull, isNotNull, or, sql, desc } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/* Item 11 — Notifications inbox (GET list)                                   */
/* -------------------------------------------------------------------------- */

const filterSchema = z.object({
  unread: z.coerce.boolean().optional(),
  highPriority: z.coerce.boolean().optional(),
  handled: z.coerce.boolean().optional(),
  type: z.enum(['booking', 'payment', 'stock', 'callback', 'system']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

const TYPE_PREFIX_MAP: Record<string, string[]> = {
  booking: ['booking.'],
  payment: ['payment.'],
  stock: ['stock.'],
  callback: ['callback.'],
  system: ['system.', 'settings.', 'auth.'],
};

export async function GET(req: Request): Promise<NextResponse> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const url = new URL(req.url);
  const parsed = filterSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }
  const f = parsed.data;

  const conds = [
    or(eq(schema.adminNotifications.adminId, admin.adminId), isNull(schema.adminNotifications.adminId)),
  ];
  if (f.unread) conds.push(isNull(schema.adminNotifications.readAt));
  if (f.handled === true) conds.push(isNotNull(schema.adminNotifications.handledAt));
  if (f.handled === false) conds.push(isNull(schema.adminNotifications.handledAt));
  if (f.highPriority) conds.push(eq(schema.adminNotifications.priority, 'high'));
  if (f.type) {
    const prefixes = TYPE_PREFIX_MAP[f.type] ?? [];
    if (prefixes.length) {
      conds.push(
        or(
          ...prefixes.map((p) =>
            sql`${schema.adminNotifications.type} LIKE ${p + '%'}`,
          ),
        )!,
      );
    }
  }

  const rows = await db
    .select({
      id: schema.adminNotifications.id,
      type: schema.adminNotifications.type,
      priority: schema.adminNotifications.priority,
      title: schema.adminNotifications.title,
      body: schema.adminNotifications.body,
      data: schema.adminNotifications.data,
      bookingId: schema.adminNotifications.bookingId,
      trackingId: schema.adminNotifications.trackingId,
      callbackRequestId: schema.adminNotifications.callbackRequestId,
      stockId: schema.adminNotifications.stockId,
      actionTarget: schema.adminNotifications.actionTarget,
      readAt: schema.adminNotifications.readAt,
      handledAt: schema.adminNotifications.handledAt,
      createdAt: schema.adminNotifications.createdAt,
    })
    .from(schema.adminNotifications)
    .where(and(...conds))
    .orderBy(desc(schema.adminNotifications.createdAt))
    .limit(f.limit);

  // Counts
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      unread: sql<number>`count(*) FILTER (WHERE ${schema.adminNotifications.readAt} IS NULL)::int`,
      highPriorityUnread: sql<number>`count(*) FILTER (WHERE ${schema.adminNotifications.priority} = 'high' AND ${schema.adminNotifications.readAt} IS NULL)::int`,
      pendingHandled: sql<number>`count(*) FILTER (WHERE ${schema.adminNotifications.handledAt} IS NULL)::int`,
    })
    .from(schema.adminNotifications)
    .where(
      or(
        eq(schema.adminNotifications.adminId, admin.adminId),
        isNull(schema.adminNotifications.adminId),
      )!,
    );

  return NextResponse.json({
    notifications: rows.map((r) => ({
      ...r,
      readAt: r.readAt ? r.readAt.toISOString() : null,
      handledAt: r.handledAt ? r.handledAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
    counts: counts ?? { total: 0, unread: 0, highPriorityUnread: 0, pendingHandled: 0 },
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  // Mark all as read
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  await db
    .update(schema.adminNotifications)
    .set({ readAt: sql`now()` })
    .where(
      and(
        or(
          eq(schema.adminNotifications.adminId, admin.adminId),
          isNull(schema.adminNotifications.adminId),
        )!,
        isNull(schema.adminNotifications.readAt),
      ),
    );
  return NextResponse.json({ success: true });
}
