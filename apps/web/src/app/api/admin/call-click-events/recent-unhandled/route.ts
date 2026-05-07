import { NextResponse } from 'next/server';
import { db, schema, and, isNull, gte, desc, sql } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_MINUTES = 30;
const DEFAULT_LIMIT = 5;
const MAX_MINUTES = 24 * 60;
const MAX_LIMIT = 50;

function clampInt(raw: string | null, def: number, min: number, max: number): number {
  if (!raw) return def;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const url = new URL(req.url);
  const minutes = clampInt(url.searchParams.get('minutes'), DEFAULT_MINUTES, 1, MAX_MINUTES);
  const limit = clampInt(url.searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const since = new Date(Date.now() - minutes * 60_000);

  const rows = await db
    .select({
      id: schema.callClickEvents.id,
      sessionId: schema.callClickEvents.sessionId,
      sourcePage: schema.callClickEvents.sourcePage,
      sourceComponent: schema.callClickEvents.sourceComponent,
      quoteId: schema.callClickEvents.quoteId,
      bookingId: schema.callClickEvents.bookingId,
      phone: schema.callClickEvents.phone,
      customerName: schema.callClickEvents.customerName,
      tyreProblemType: schema.callClickEvents.tyreProblemType,
      jobType: schema.callClickEvents.jobType,
      locationSummary: schema.callClickEvents.locationSummary,
      createdAt: schema.callClickEvents.createdAt,
    })
    .from(schema.callClickEvents)
    .where(
      and(
        isNull(schema.callClickEvents.handledAt),
        gte(schema.callClickEvents.createdAt, since),
      ),
    )
    .orderBy(desc(schema.callClickEvents.createdAt))
    .limit(limit);

  void sql;

  const items = rows.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    sourcePage: r.sourcePage,
    sourceComponent: r.sourceComponent,
    quoteId: r.quoteId,
    bookingId: r.bookingId,
    phone: r.phone,
    customerName: r.customerName,
    tyreProblemType: r.tyreProblemType,
    jobType: r.jobType,
    locationSummary: r.locationSummary,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ items, minutes, limit });
}
