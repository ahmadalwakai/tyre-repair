import { NextResponse } from 'next/server';
import { db, schema, gt, desc } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const cutoff = new Date(Date.now() - 15 * 60_000);
  let rows;
  try {
    rows = await db
      .select({
        visitorId: schema.liveVisitors.id,
        currentPage: schema.liveVisitors.currentPage,
        approxCity: schema.liveVisitors.approxCity,
        approxRegion: schema.liveVisitors.approxRegion,
        approxCountry: schema.liveVisitors.approxCountry,
        latitudeApprox: schema.liveVisitors.latitudeApprox,
        longitudeApprox: schema.liveVisitors.longitudeApprox,
        consentGiven: schema.liveVisitors.consentGiven,
        lastSeenAt: schema.liveVisitors.lastSeenAt,
      })
      .from(schema.liveVisitors)
      .where(gt(schema.liveVisitors.lastSeenAt, cutoff))
      .orderBy(desc(schema.liveVisitors.lastSeenAt))
      .limit(200);
  } catch {
    return NextResponse.json({ error: 'Could not load visitors' }, { status: 500 });
  }

  const toFiniteNumber = (raw: unknown): number | null => {
    if (raw == null) return null;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const visitors = rows.map((v) => ({
    visitorId: v.visitorId,
    currentPage: v.currentPage,
    approxCity: v.approxCity,
    approxRegion: v.approxRegion,
    approxCountry: v.approxCountry,
    latitude: toFiniteNumber(v.latitudeApprox),
    longitude: toFiniteNumber(v.longitudeApprox),
    consentGiven: v.consentGiven,
    lastSeenAt: v.lastSeenAt.toISOString(),
  }));
  return NextResponse.json({ visitors, count: visitors.length });
}
