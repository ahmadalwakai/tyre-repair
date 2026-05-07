/**
 * Route intelligence helper for the Quick Booking wizard.
 *
 * Given a customer location (coordinates and/or label) returns:
 *  - distance + drive time from the workshop (Mapbox Directions, traffic profile)
 *  - simple traffic level label (LOW | MODERATE | HIGH | UNKNOWN) derived
 *    from the ratio of traffic-aware duration vs. typical driving duration
 *  - reverse-geocoded address (best effort)
 *  - an external Google Maps navigation URL
 *  - a coarse "locationConfidence" hint: CONFIRMED_ADDRESS | GPS_ONLY |
 *    WEAK_ADDRESS | MISSING_LOCATION
 *
 * No DB writes. Read-only. Admin auth required.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    locationLabel: z.string().trim().max(240).optional(),
  })
  .refine(
    (v) => (v.latitude != null && v.longitude != null) || (v.locationLabel?.length ?? 0) > 0,
    { message: 'Provide coordinates or a location label' },
  );

const TOKEN = process.env['MAPBOX_ACCESS_TOKEN'] ?? process.env['NEXT_PUBLIC_MAPBOX_TOKEN'] ?? '';
const WORKSHOP_LAT = Number(process.env['WORKSHOP_LAT'] ?? '55.8585');
const WORKSHOP_LNG = Number(process.env['WORKSHOP_LNG'] ?? '-4.2155');

type LocationConfidence =
  | 'CONFIRMED_ADDRESS'
  | 'GPS_ONLY'
  | 'WEAK_ADDRESS'
  | 'MISSING_LOCATION';

type TrafficLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN';

interface MapboxDirectionsResponse {
  routes?: Array<{ distance?: number; duration?: number; duration_typical?: number }>;
}

interface MapboxGeocodingResponse {
  features?: Array<{
    center?: [number, number];
    place_name?: string;
    properties?: { postcode?: string };
    context?: Array<{ id?: string; text?: string }>;
  }>;
}

async function fetchDrivingTraffic(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<{ distanceMiles: number; durationMinutes: number; durationTypicalMinutes: number | null } | null> {
  if (!TOKEN) return null;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=false&annotations=duration&access_token=${TOKEN}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as MapboxDirectionsResponse;
    const route = json.routes?.[0];
    if (!route || typeof route.distance !== 'number' || typeof route.duration !== 'number') {
      return null;
    }
    return {
      distanceMiles: route.distance / 1609.344,
      durationMinutes: route.duration / 60,
      durationTypicalMinutes:
        typeof route.duration_typical === 'number' ? route.duration_typical / 60 : null,
    };
  } catch {
    return null;
  }
}

async function forwardGeocode(
  query: string,
): Promise<{ lat: number; lng: number; place: string | null; postcode: string | null } | null> {
  if (!TOKEN) return null;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
    `${encodeURIComponent(query)}.json?country=gb&limit=1&access_token=${TOKEN}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as MapboxGeocodingResponse;
    const feature = json.features?.[0];
    const center = feature?.center;
    if (!feature || !center || center.length !== 2) return null;
    let postcode: string | null = feature.properties?.postcode ?? null;
    if (!postcode && feature.context) {
      const ctx = feature.context.find((c) => c.id?.startsWith('postcode'));
      postcode = ctx?.text ?? null;
    }
    return {
      lat: center[1],
      lng: center[0],
      place: feature.place_name ?? null,
      postcode,
    };
  } catch {
    return null;
  }
}

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ place: string | null; postcode: string | null } | null> {
  if (!TOKEN) return null;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
    `${lng},${lat}.json?types=address,postcode,place&limit=1&access_token=${TOKEN}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as MapboxGeocodingResponse;
    const feature = json.features?.[0];
    if (!feature) return null;
    let postcode: string | null = feature.properties?.postcode ?? null;
    if (!postcode && feature.context) {
      const ctx = feature.context.find((c) => c.id?.startsWith('postcode'));
      postcode = ctx?.text ?? null;
    }
    return { place: feature.place_name ?? null, postcode };
  } catch {
    return null;
  }
}

function classifyTraffic(
  durationMinutes: number,
  durationTypicalMinutes: number | null,
): TrafficLevel {
  if (!durationTypicalMinutes || durationTypicalMinutes <= 0) return 'UNKNOWN';
  const ratio = durationMinutes / durationTypicalMinutes;
  if (ratio < 1.1) return 'LOW';
  if (ratio < 1.35) return 'MODERATE';
  return 'HIGH';
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
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
  const data = parsed.data;

  const warnings: string[] = [];
  let lat = data.latitude ?? null;
  let lng = data.longitude ?? null;
  let resolvedAddress: string | null = null;
  let resolvedPostcode: string | null = null;
  let confidence: LocationConfidence = 'MISSING_LOCATION';

  if (lat != null && lng != null) {
    confidence = 'GPS_ONLY';
    const reverse = await reverseGeocode(lat, lng);
    if (reverse) {
      resolvedAddress = reverse.place;
      resolvedPostcode = reverse.postcode;
      if (reverse.postcode) confidence = 'CONFIRMED_ADDRESS';
    } else {
      warnings.push('Could not reverse-geocode coordinates.');
    }
  } else if (data.locationLabel) {
    const forward = await forwardGeocode(data.locationLabel);
    if (forward) {
      lat = forward.lat;
      lng = forward.lng;
      resolvedAddress = forward.place;
      resolvedPostcode = forward.postcode;
      confidence = forward.postcode ? 'CONFIRMED_ADDRESS' : 'WEAK_ADDRESS';
    } else {
      confidence = 'WEAK_ADDRESS';
      warnings.push('Could not match this address — please ask the customer to share location.');
    }
  }

  let distanceMiles: number | null = null;
  let durationMinutes: number | null = null;
  let trafficLabel: TrafficLevel = 'UNKNOWN';
  let externalNavigationUrl: string | null = null;

  if (lat != null && lng != null) {
    const directions = await fetchDrivingTraffic(
      { lat: WORKSHOP_LAT, lng: WORKSHOP_LNG },
      { lat, lng },
    );
    if (directions) {
      distanceMiles = directions.distanceMiles;
      durationMinutes = directions.durationMinutes;
      trafficLabel = classifyTraffic(directions.durationMinutes, directions.durationTypicalMinutes);
    } else {
      warnings.push('Mapbox traffic data unavailable.');
    }
    externalNavigationUrl =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${lat},${lng}&travelmode=driving`;
  }

  return NextResponse.json(
    {
      latitude: lat,
      longitude: lng,
      resolvedAddress,
      resolvedPostcode,
      locationConfidence: confidence,
      distanceMiles,
      durationMinutes,
      trafficLabel,
      externalNavigationUrl,
      warnings,
    },
    { status: 200 },
  );
}
