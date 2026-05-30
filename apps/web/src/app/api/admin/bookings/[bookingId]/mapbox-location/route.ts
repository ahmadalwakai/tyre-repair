import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/* Item 18 — Mapbox location lookup for booking detail                        */
/*                                                                            */
/* Server-side reverse-geocode + map preview + navigation deep links.         */
/* No Google Maps. Uses Mapbox Geocoding + Static Images APIs.                */
/* -------------------------------------------------------------------------- */

const idSchema = z.string().uuid();

type LocationConfidence =
  | 'CONFIRMED_ADDRESS'
  | 'GPS_ONLY'
  | 'WEAK_ADDRESS'
  | 'MISSING_LOCATION';

interface MapboxLocationResponse {
  bookingId: string;
  hasLocation: boolean;
  addressLabel: string | null;
  coordinates: { lat: number; lng: number } | null;
  locationConfidence: LocationConfidence;
  mapPreviewUrl: string | null;
  externalNavigationOptions: {
    appleMapsUrl: string | null;
    genericGeoUrl: string | null;
    mapboxDirectionsUrl: string | null;
  };
  warningMessage: string | null;
}

interface MapboxFeature {
  place_name?: string;
  text?: string;
}

function getMapboxToken(): string | null {
  return (
    process.env.MAPBOX_ACCESS_TOKEN ??
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
    null
  );
}

async function reverseGeocode(
  lat: number,
  lng: number,
  token: string,
): Promise<string | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${encodeURIComponent(token)}&limit=1&country=gb`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: MapboxFeature[] };
    return data.features?.[0]?.place_name ?? null;
  } catch {
    return null;
  }
}

function buildStaticMapUrl(lat: number, lng: number, token: string): string {
  // Marker + Mapbox Streets style
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l-car+E30613(${lng},${lat})/${lng},${lat},15,0/600x300@2x?access_token=${encodeURIComponent(token)}`;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ bookingId: string }> },
): Promise<NextResponse<MapboxLocationResponse | { error: string }>> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { bookingId } = await context.params;
  if (!idSchema.safeParse(bookingId).success) {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
  }

  const rows = await db
    .select({
      bookingId: schema.bookings.id,
      lat: schema.customerLocations.latitude,
      lng: schema.customerLocations.longitude,
      addressLine1: schema.customerLocations.addressLine1,
      city: schema.customerLocations.city,
      postcode: schema.customerLocations.postcode,
      accuracyMeters: schema.customerLocations.accuracyMeters,
    })
    .from(schema.bookings)
    .leftJoin(
      schema.customerLocations,
      eq(schema.customerLocations.id, schema.bookings.locationId),
    )
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const latNum = row.lat == null ? null : Number(row.lat);
  const lngNum = row.lng == null ? null : Number(row.lng);
  const hasCoords =
    latNum != null && lngNum != null && Number.isFinite(latNum) && Number.isFinite(lngNum);

  const addressParts = [row.addressLine1, row.city, row.postcode].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  );
  const localAddress = addressParts.length ? addressParts.join(', ') : null;
  const accuracy = row.accuracyMeters == null ? null : Number(row.accuracyMeters);

  // Confidence
  let confidence: LocationConfidence;
  if (!hasCoords && !localAddress) confidence = 'MISSING_LOCATION';
  else if (!hasCoords && localAddress) confidence = 'WEAK_ADDRESS';
  else if (hasCoords && !localAddress) confidence = 'GPS_ONLY';
  else if (hasCoords && accuracy != null && accuracy > 100) confidence = 'GPS_ONLY';
  else confidence = 'CONFIRMED_ADDRESS';

  const token = getMapboxToken();
  let addressLabel = localAddress;
  let mapPreviewUrl: string | null = null;

  if (hasCoords && token) {
    mapPreviewUrl = buildStaticMapUrl(latNum, lngNum, token);
    if (!addressLabel) {
      addressLabel = await reverseGeocode(latNum, lngNum, token);
    }
  }

  const appleMapsUrl =
    hasCoords ? `https://maps.apple.com/?ll=${latNum},${lngNum}` : null;
  const genericGeoUrl =
    hasCoords
      ? `geo:${latNum},${lngNum}?q=${latNum},${lngNum}${addressLabel ? `(${encodeURIComponent(addressLabel)})` : ''}`
      : null;
  const mapboxDirectionsUrl =
    hasCoords
      ? `https://www.mapbox.com/directions?route=driving;${lngNum},${latNum}`
      : null;

  let warningMessage: string | null = null;
  switch (confidence) {
    case 'MISSING_LOCATION':
      warningMessage =
        'No location for this booking. Phone the customer for an address before dispatch.';
      break;
    case 'WEAK_ADDRESS':
      warningMessage =
        'Address only, no GPS pin. Consider phoning the customer to confirm exact location.';
      break;
    case 'GPS_ONLY':
      warningMessage =
        'GPS pin only — address not confirmed. Confirm with the customer before dispatch.';
      break;
    default:
      warningMessage = null;
  }
  if (!token && hasCoords) {
    warningMessage =
      (warningMessage ?? '') +
      (warningMessage ? ' ' : '') +
      'Map preview unavailable: MAPBOX_ACCESS_TOKEN is not configured.';
  }

  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'booking.mapbox_location.viewed',
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: { confidence, hasCoords, hasMapboxToken: !!token },
  });

  return NextResponse.json({
    bookingId,
    hasLocation: hasCoords || !!localAddress,
    addressLabel,
    coordinates: hasCoords ? { lat: latNum, lng: lngNum } : null,
    locationConfidence: confidence,
    mapPreviewUrl,
    externalNavigationOptions: {
      appleMapsUrl,
      genericGeoUrl,
      mapboxDirectionsUrl,
    },
    warningMessage,
  });
}
