import type { DistancePricingFactor, PricingRuleMap } from './types';
import { getPricingRuleNumber, } from './rules';
import { roundGbp } from './money';

const FALLBACK_HQ_LAT = 55.858876;
const FALLBACK_HQ_LNG = -4.218064;
const EARTH_RADIUS_MILES = 3958.7613;

function getHqCoords(): { lat: number; lng: number } {
  const lat = Number(process.env.BUSINESS_HQ_LAT);
  const lng = Number(process.env.BUSINESS_HQ_LNG);
  return {
    lat: Number.isFinite(lat) ? lat : FALLBACK_HQ_LAT,
    lng: Number.isFinite(lng) ? lng : FALLBACK_HQ_LNG,
  };
}

/** Public helper — exported for the Action Queue / Today report code so they
 * do not need to invoke the full pricing engine just to compute distance. */
export function getWorkshopHqCoords(): { lat: number; lng: number } {
  return getHqCoords();
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  return EARTH_RADIUS_MILES * c;
}

/** Public helper for callers that only need distance (e.g. Action Queue). */
export function distanceMilesFromHq(
  lat: number | null | undefined,
  lng: number | null | undefined,
): number | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const hq = getHqCoords();
  return Math.round(haversineMiles(hq, { lat, lng }) * 100) / 100;
}

export interface DistanceInput {
  latitude: number | null;
  longitude: number | null;
}

export function calculateDistanceFactor(
  rules: PricingRuleMap,
  input: DistanceInput,
): DistancePricingFactor {
  const freeMiles = getPricingRuleNumber(rules, 'distance_free_miles', 5);
  const perMileGbp = getPricingRuleNumber(rules, 'distance_per_mile_gbp', 1.2);

  if (input.latitude === null || input.longitude === null) {
    return {
      distanceMiles: null,
      freeMiles,
      perMileGbp,
      feeGbp: '0.00',
      reason: 'Location coordinates unavailable',
    };
  }

  const hq = getHqCoords();
  const rawMiles = haversineMiles(hq, { lat: input.latitude, lng: input.longitude });
  const distanceMiles = Math.round(rawMiles * 100) / 100;
  const billableMiles = Math.max(0, distanceMiles - freeMiles);
  const feeGbp = roundGbp(billableMiles * perMileGbp);
  const reason =
    billableMiles <= 0
      ? `Within free callout zone (${freeMiles} miles)`
      : `${billableMiles.toFixed(2)} billable miles × £${perMileGbp.toFixed(2)}/mile`;

  return { distanceMiles, freeMiles, perMileGbp, feeGbp, reason };
}
