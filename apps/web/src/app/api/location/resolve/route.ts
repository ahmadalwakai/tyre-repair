import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db, schema } from '@tyrerepair/db';
import { locationResolveSchema } from '@/lib/quote/validation';
import { verifyLocationCaptureToken } from '@/lib/security/location-token';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 32);
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = locationResolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const { token, latitude, longitude, accuracyMeters } = parsed.data;
  const verify = await verifyLocationCaptureToken(token);
  if (!verify.ok) {
    return NextResponse.json(
      { error: verify.reason === 'expired' ? 'Token expired' : 'Invalid token' },
      { status: 401 },
    );
  }

  try {
    const inserted = await db
      .insert(schema.customerLocations)
      .values({
        captureMethod: 'browser_geolocation',
        latitude: latitude.toFixed(7),
        longitude: longitude.toFixed(7),
        accuracyMeters:
          typeof accuracyMeters === 'number' ? Math.round(accuracyMeters) : null,
        country: 'United Kingdom',
      })
      .returning({
        id: schema.customerLocations.id,
        createdAt: schema.customerLocations.createdAt,
      });

    const row = inserted[0];
    if (!row) {
      return NextResponse.json({ error: 'Could not save location' }, { status: 500 });
    }

    await writeAuditLogSafe({
      actorType: 'customer',
      action: 'booking.location_capture.resolved',
      entityType: 'lead',
      entityId: row.id,
      metadata: {
        tokenHash: hashToken(token),
        latitude,
        longitude,
        accuracyMeters: accuracyMeters ?? null,
        method: verify.payload.method,
      },
    });

    return NextResponse.json(
      {
        locationId: row.id,
        latitude,
        longitude,
        accuracyMeters: accuracyMeters ?? null,
        createdAt: row.createdAt.toISOString(),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: 'Could not save location' }, { status: 500 });
  }
}
