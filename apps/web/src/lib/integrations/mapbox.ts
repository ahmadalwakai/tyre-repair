import 'server-only';

export interface MapboxConfig {
  publicToken: string | null;
  serverToken: string | null;
  hasAny: boolean;
}

export function getMapboxConfig(): MapboxConfig {
  const publicToken =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ??
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
    null;
  const serverToken = process.env.MAPBOX_ACCESS_TOKEN ?? null;
  return {
    publicToken: publicToken && publicToken.length > 0 ? publicToken : null,
    serverToken: serverToken && serverToken.length > 0 ? serverToken : null,
    hasAny: Boolean(publicToken) || Boolean(serverToken),
  };
}

export interface ReverseGeocodeInput {
  latitude: number;
  longitude: number;
}

export interface NormalizedAddress {
  latitude: number;
  longitude: number;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  formattedAddress: string;
}

export type ReverseGeocodeResult =
  | { ok: true; address: NormalizedAddress }
  | {
      ok: false;
      code: 'missing_token' | 'no_address' | 'upstream_error' | 'timeout' | 'unknown';
      status: number;
      message: string;
    };

interface MapboxFeature {
  id?: string;
  place_type?: string[];
  text?: string;
  place_name?: string;
  address?: string;
  context?: Array<{ id?: string; text?: string; short_code?: string }>;
}

interface MapboxReverseGeocodeResponse {
  features?: MapboxFeature[];
}

function pickContext(feature: MapboxFeature, prefix: string): string | null {
  const ctx = feature.context?.find((c) => c.id?.startsWith(`${prefix}.`));
  return ctx?.text ?? null;
}

function pickFeatureByType(
  features: MapboxFeature[],
  type: string,
): MapboxFeature | undefined {
  return features.find((f) => f.place_type?.includes(type));
}

/**
 * Reverse-geocode a lat/lng pair via Mapbox and return a UK-friendly
 * normalized address suitable for the quote flow.
 *
 * Falls back gracefully when individual fields are missing.
 */
export async function reverseGeocodeCoordinates(
  input: ReverseGeocodeInput,
): Promise<ReverseGeocodeResult> {
  const { publicToken, serverToken } = getMapboxConfig();
  // Server token preferred for server-side calls; fall back to public token if
  // a separate server token isn't configured (single-token setups).
  const token = serverToken ?? publicToken;
  if (!token) {
    return {
      ok: false,
      code: 'missing_token',
      status: 503,
      message: 'Reverse geocoding is not configured',
    };
  }

  const lng = input.longitude.toFixed(6);
  const lat = input.latitude.toFixed(6);
  // Mapbox reverse geocoding rule: `limit` may only be used together with a
  // single `types` value. We want a small set of feature types to choose from
  // (address, postcode, place), so we omit `limit` and let Mapbox return the
  // default ranked list of features for this point.
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&country=gb` +
    `&types=address,postcode,place,locality,neighborhood`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      let detail = '';
      try {
        detail = (await res.text()).slice(0, 300);
      } catch {
        // ignore
      }
      console.error(
        '[mapbox] reverse geocode failed',
        res.status,
        res.statusText,
        detail,
      );
      return {
        ok: false,
        code: 'upstream_error',
        status: 502,
        message: 'Reverse geocoding service is temporarily unavailable',
      };
    }

    const data = (await res.json()) as MapboxReverseGeocodeResponse;
    const features = data.features ?? [];
    if (features.length === 0) {
      return {
        ok: false,
        code: 'no_address',
        status: 404,
        message: 'Could not determine an address for this location.',
      };
    }

    const addressFeature = pickFeatureByType(features, 'address');
    const postcodeFeature = pickFeatureByType(features, 'postcode');
    const placeFeature =
      pickFeatureByType(features, 'place') ??
      pickFeatureByType(features, 'locality') ??
      pickFeatureByType(features, 'neighborhood');

    // Address line 1: prefer "<number> <street>" if available, otherwise fall
    // back to the feature text or place_name first segment.
    let addressLine1: string | null = null;
    if (addressFeature?.text) {
      const number = addressFeature.address?.trim();
      addressLine1 = number ? `${number} ${addressFeature.text}` : addressFeature.text;
    } else if (placeFeature?.text) {
      addressLine1 = placeFeature.text;
    } else if (features[0]?.place_name) {
      addressLine1 = features[0].place_name.split(',')[0]?.trim() ?? null;
    }

    // City: locality > place > neighborhood (from context).
    const primary = addressFeature ?? placeFeature ?? features[0]!;
    const city =
      pickContext(primary, 'locality') ??
      pickContext(primary, 'place') ??
      placeFeature?.text ??
      null;

    // Postcode: dedicated postcode feature, or context.postcode of address.
    const postcode =
      postcodeFeature?.text ?? pickContext(primary, 'postcode') ?? null;

    const country =
      pickContext(primary, 'country') ??
      primary.context?.find((c) => c.id?.startsWith('country.'))?.text ??
      'United Kingdom';

    const formattedAddress =
      primary.place_name ??
      [addressLine1, city, postcode, country].filter(Boolean).join(', ');

    const address: NormalizedAddress = {
      latitude: input.latitude,
      longitude: input.longitude,
      addressLine1,
      addressLine2: null,
      city,
      postcode,
      country,
      formattedAddress,
    };
    return { ok: true, address };
  } catch (err) {
    clearTimeout(timer);
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      code: aborted ? 'timeout' : 'unknown',
      status: 502,
      message: aborted ? 'Reverse geocoding timed out' : 'Reverse geocoding failed',
    };
  }
}

