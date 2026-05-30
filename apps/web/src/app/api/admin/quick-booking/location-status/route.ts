/**
 * Polling endpoint for the Quick Booking wizard.
 *
 * After the admin sends/shares a secure location-capture link, the wizard
 * polls this endpoint with the same token. If the customer has already
 * tapped the link and shared their GPS, we return the captured coordinates
 * so the wizard can auto-fill Step 1 without the admin retyping anything.
 *
 * Lookup is by sha256(token) recorded in audit_logs.metadata.tokenHash
 * (written by /api/location/resolve), so no schema migration is needed.
 */
import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { verifyLocationCaptureToken } from '@/lib/security/location-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LocationStatusResponse {
  status: 'pending' | 'received' | 'expired' | 'invalid';
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number | null;
  receivedAt?: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 32);
}

export async function GET(
  req: Request,
): Promise<NextResponse<LocationStatusResponse | { error: string }>> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token')?.trim();
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const verify = await verifyLocationCaptureToken(token);
  if (!verify.ok) {
    return NextResponse.json(
      { status: verify.reason === 'expired' ? 'expired' : 'invalid' },
      { status: 200 },
    );
  }

  const tokenHash = hashToken(token);

  const rows = await db
    .select({
      id: schema.auditLogs.id,
      metadata: schema.auditLogs.metadata,
      createdAt: schema.auditLogs.createdAt,
    })
    .from(schema.auditLogs)
    .where(
      and(
        eq(schema.auditLogs.action, 'booking.location_capture.resolved'),
        sql`${schema.auditLogs.metadata} ->> 'tokenHash' = ${tokenHash}`,
      ),
    )
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(1);

  const hit = rows[0];
  if (!hit) {
    return NextResponse.json({ status: 'pending' }, { status: 200 });
  }

  const meta = (hit.metadata ?? {}) as {
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number | null;
  };
  if (typeof meta.latitude !== 'number' || typeof meta.longitude !== 'number') {
    return NextResponse.json({ status: 'pending' }, { status: 200 });
  }

  return NextResponse.json(
    {
      status: 'received',
      latitude: meta.latitude,
      longitude: meta.longitude,
      accuracyMeters: meta.accuracyMeters ?? null,
      receivedAt: hit.createdAt.toISOString(),
    },
    { status: 200 },
  );
}
