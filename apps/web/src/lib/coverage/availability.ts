import type {
  CoverageZone,
  MatchedZoneSummary,
  PostcodeAvailabilityResult,
  PostcodeAvailabilityStatus,
  SuggestedAction,
} from '@/types/coverage';
import { extractAreaCode, extractOutwardCode } from './postcode';
import { getZonesForMatching } from './zones';

/**
 * Match a normalised UK postcode to a coverage zone.
 *
 * Strategy:
 *   1. Exact outward-code hit (e.g. "EH10" -> Edinburgh zone).
 *   2. Area-code letters hit (e.g. "G" -> Glasgow zone).
 *   3. No match -> null.
 *
 * When multiple zones could match (rare, e.g. area "G" + a future PA1 entry),
 * pick the zone with the lowest `priority` value.
 */
export async function matchPostcodeToZone(
  normalizedPostcode: string,
): Promise<CoverageZone | null> {
  const outward = extractOutwardCode(normalizedPostcode);
  if (!outward) return null;
  const area = extractAreaCode(outward);
  const zones = await getZonesForMatching();

  const exact: CoverageZone[] = [];
  const areaMatches: CoverageZone[] = [];

  for (const zone of zones) {
    for (const prefix of zone.postcodePrefixes) {
      if (prefix === outward) {
        exact.push(zone);
        break;
      }
      if (area && prefix === area) {
        areaMatches.push(zone);
        break;
      }
    }
  }

  const pool = exact.length > 0 ? exact : areaMatches;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => a.priority - b.priority)[0] ?? null;
}

/**
 * Suggest the closest active zone for postcodes that are not directly
 * covered. Currently picks the lowest-priority active zone as a best-effort
 * hint. Without geocoding we never promise this is the physically nearest.
 */
async function findNearestActiveZone(): Promise<CoverageZone | null> {
  const zones = await getZonesForMatching();
  const active = zones.filter((z) => z.status === 'active');
  if (active.length === 0) return null;
  return [...active].sort((a, b) => a.priority - b.priority)[0] ?? null;
}

function toMatchedZoneSummary(zone: CoverageZone): MatchedZoneSummary {
  return {
    id: zone.id,
    name: zone.name,
    slug: zone.slug,
    cityOrRegion: zone.cityOrRegion,
  };
}

function deriveStatus(zone: CoverageZone): PostcodeAvailabilityStatus {
  if (zone.status !== 'active') return 'not_currently_covered';
  if (zone.availableNow) return 'available_now';
  if (zone.availableToday) return 'available_today';
  if (zone.availableTomorrow) return 'available_tomorrow';
  return 'not_currently_covered';
}

function deriveAction(
  status: PostcodeAvailabilityStatus,
  zone: CoverageZone | null,
): SuggestedAction {
  if (zone && zone.status === 'paused') return 'request_callback';
  switch (status) {
    case 'available_now':
      return 'call_now';
    case 'available_today':
      return 'book_now';
    case 'available_tomorrow':
      return 'book_now';
    case 'not_currently_covered':
      return 'join_waiting_list';
    default:
      return 'request_callback';
  }
}

function formatResponseTimeLabel(zone: CoverageZone | null): string {
  if (!zone || zone.status !== 'active') return 'Not currently covered';
  if (zone.estimatedResponseMinutesMax === 0) return 'Not currently covered';
  if (zone.availableNow) {
    return `${zone.estimatedResponseMinutesMin}–${zone.estimatedResponseMinutesMax} minutes`;
  }
  if (zone.availableToday) return 'Same-day dispatch';
  if (zone.availableTomorrow) return 'Next-day dispatch';
  return 'Not currently covered';
}

export interface BuildAvailabilityInput {
  normalizedPostcode: string;
  intent: string;
  source: string;
}

export async function buildPostcodeAvailability(
  input: BuildAvailabilityInput,
): Promise<PostcodeAvailabilityResult> {
  const outward = extractOutwardCode(input.normalizedPostcode);
  const zone = await matchPostcodeToZone(input.normalizedPostcode);

  const status: PostcodeAvailabilityStatus = zone
    ? deriveStatus(zone)
    : 'not_currently_covered';

  const matchedZone = zone ? toMatchedZoneSummary(zone) : null;
  const nearest =
    !zone || status === 'not_currently_covered' ? await findNearestActiveZone() : null;

  return {
    normalizedPostcode: input.normalizedPostcode,
    outwardCode: outward,
    status,
    matchedZone,
    nearestCoverageZone: nearest ? toMatchedZoneSummary(nearest) : null,
    estimatedResponseTimeLabel: formatResponseTimeLabel(zone),
    callOutFeePence: zone && zone.status === 'active' ? zone.callOutFeePence : null,
    suggestedAction: deriveAction(status, zone),
    trackingPayload: {
      status,
      outwardCode: outward,
      zoneSlug: matchedZone?.slug ?? null,
      intent: input.intent,
      source: input.source,
    },
  };
}
