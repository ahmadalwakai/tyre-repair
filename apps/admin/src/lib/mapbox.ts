/**
 * Lightweight Mapbox helpers used by the Emergency Assist popup.
 *
 * All calls are best-effort and never throw — UI must degrade gracefully
 * when the token is missing, the network is offline, or a coordinate is
 * out of range.
 */

const TOKEN = process.env['EXPO_PUBLIC_MAPBOX_TOKEN'] ?? '';

export function hasMapboxToken(): boolean {
  return TOKEN.length > 0;
}

interface StaticMapInput {
  customer: { latitude: number; longitude: number };
  workshop: { latitude: number; longitude: number };
  width: number;
  height: number;
  /** When true, draws a gold line between the two points. */
  drawLine?: boolean;
}

/**
 * Builds a Mapbox Static Images URL containing two pins (customer in gold,
 * workshop in white) auto-fitted to both points. Works on web + native via
 * a plain `<Image source={{ uri }} />` — no native module required.
 */
export function buildStaticMapUrl(input: StaticMapInput): string | null {
  if (!TOKEN) return null;
  const { customer, workshop, width, height, drawLine } = input;
  if (!Number.isFinite(customer.latitude) || !Number.isFinite(customer.longitude)) return null;
  if (!Number.isFinite(workshop.latitude) || !Number.isFinite(workshop.longitude)) return null;
  // Mapbox Static Images: use only well-known Maki icons to avoid 422 errors.
  //   - "car" exists in the default Maki set (customer)
  //   - "marker" is the universal fallback (workshop / base)
  const customerPin = `pin-l-car+ffd700(${customer.longitude},${customer.latitude})`;
  const workshopPin = `pin-l-marker+ffffff(${workshop.longitude},${workshop.latitude})`;
  const overlays: string[] = [];
  if (drawLine) {
    const line = {
      type: 'LineString' as const,
      coordinates: [
        [workshop.longitude, workshop.latitude],
        [customer.longitude, customer.latitude],
      ],
      properties: {
        stroke: '#FFD700',
        'stroke-width': 3,
        'stroke-opacity': 0.85,
      },
    };
    overlays.push(`geojson(${encodeURIComponent(JSON.stringify(line))})`);
  }
  overlays.push(customerPin, workshopPin);
  const safeWidth = Math.max(120, Math.min(1280, Math.round(width)));
  const safeHeight = Math.max(120, Math.min(1280, Math.round(height)));
  return (
    `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${overlays.join(',')}/auto/` +
    `${safeWidth}x${safeHeight}@2x?padding=40,40,40,40&access_token=${TOKEN}`
  );
}

export interface DirectionsResult {
  distanceMiles: number;
  durationMinutes: number;
}

/** Mapbox Directions (driving). Returns null on any failure. */
export async function fetchDrivingDirections(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<DirectionsResult | null> {
  if (!TOKEN) return null;
  if (!Number.isFinite(from.latitude) || !Number.isFinite(from.longitude)) return null;
  if (!Number.isFinite(to.latitude) || !Number.isFinite(to.longitude)) return null;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/` +
    `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=false&geometries=geojson&access_token=${TOKEN}`;
  try {
    const init: RequestInit = signal ? { signal } : {};
    const res = await fetch(url, init);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      routes?: Array<{ distance?: number; duration?: number }>;
    };
    const route = json.routes?.[0];
    if (!route || typeof route.distance !== 'number' || typeof route.duration !== 'number') {
      return null;
    }
    return {
      distanceMiles: route.distance / 1609.344,
      durationMinutes: route.duration / 60,
    };
  } catch {
    return null;
  }
}

/** Mapbox reverse-geocode → returns formatted address + postcode (best-effort). */
export async function reverseGeocode(
  point: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<{ formatted: string | null; postcode: string | null } | null> {
  if (!TOKEN) return null;
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return null;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
    `${point.longitude},${point.latitude}.json` +
    `?types=address,postcode,place&limit=1&access_token=${TOKEN}`;
  try {
    const init: RequestInit = signal ? { signal } : {};
    const res = await fetch(url, init);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      features?: Array<{
        place_name?: string;
        context?: Array<{ id?: string; text?: string }>;
        properties?: { postcode?: string };
      }>;
    };
    const feature = json.features?.[0];
    if (!feature) return null;
    const formatted = feature.place_name ?? null;
    let postcode: string | null = null;
    if (feature.properties?.postcode) {
      postcode = feature.properties.postcode;
    } else if (feature.context) {
      const ctx = feature.context.find((c) => c.id?.startsWith('postcode'));
      postcode = ctx?.text ?? null;
    }
    return { formatted, postcode };
  } catch {
    return null;
  }
}

/** Great-circle distance (miles) between two lat/lng points. */
export function haversineMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const earthMiles = 3958.7613;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthMiles * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Build a navigation deep link that works across platforms. */
export function buildNavigationUrl(
  to: { latitude: number; longitude: number },
  label?: string,
): string {
  const q = label ? encodeURIComponent(label) : `${to.latitude},${to.longitude}`;
  // Google Maps universal link — opens the Google Maps app on Android, web on
  // desktop, and prompts for app on iOS.
  return `https://www.google.com/maps/dir/?api=1&destination=${to.latitude},${to.longitude}&destination_place_id=&travelmode=driving&query=${q}`;
}
