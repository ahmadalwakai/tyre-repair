/**
 * Types for the Scotland mobile tyre coverage zone system.
 *
 * These types describe service-area coverage only. They are NOT physical
 * branches, retail stores, or fake local addresses. A zone represents the
 * area a mobile van fleet can dispatch to from the Glasgow HQ.
 */

export type CoverageZoneStatus = 'active' | 'paused' | 'unavailable';

export interface CoverageZone {
  /** Stable machine id, used as analytics + admin reference. */
  readonly id: string;
  /** Display name shown to admin (e.g. "Glasgow & West"). */
  readonly name: string;
  /** URL-safe slug used in internal links and tracking payloads. */
  readonly slug: string;
  readonly status: CoverageZoneStatus;
  /** Primary city or wider region this zone represents. */
  readonly cityOrRegion: string;
  /**
   * Postcode outward-code prefixes the zone serves.
   *
   * Each entry is either:
   *   - a full outward code (e.g. "G1", "EH10"), matched exactly, OR
   *   - a letters-only area code (e.g. "G", "EH"), matched against the
   *     extracted area prefix when no exact outward-code hit exists.
   *
   * Always upper-case, never includes a space.
   */
  readonly postcodePrefixes: readonly string[];
  /** Representative central postcode for the zone (used for radius/route hints). */
  readonly basePostcode: string;
  /** Rough operational radius from base, in MILES (UK convention). */
  readonly radiusMiles: number;
  readonly estimatedResponseMinutesMin: number;
  readonly estimatedResponseMinutesMax: number;
  /** Call-out fee in pence (GBP minor units). Source of truth = pricing engine. */
  readonly callOutFeePence: number;
  readonly availableNow: boolean;
  readonly availableToday: boolean;
  readonly availableTomorrow: boolean;
  /** Soft daily job ceiling. Future admin/dispatch will read this. */
  readonly dailyCapacity: number;
  /**
   * Lower number = higher priority. Used to rank near-by zone matches and
   * the "nearest coverage zone" suggestion when no direct prefix matches.
   */
  readonly priority: number;
  /** Free-form admin note, never shown to public. */
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type PostcodeAvailabilityStatus =
  | 'available_now'
  | 'available_today'
  | 'available_tomorrow'
  | 'not_currently_covered';

export type SuggestedAction =
  | 'call_now'
  | 'book_now'
  | 'request_callback'
  | 'join_waiting_list';

export interface PostcodeAvailabilityRequest {
  postcode: string;
  intent?: string;
  source?: string;
}

export interface MatchedZoneSummary {
  id: string;
  name: string;
  slug: string;
  cityOrRegion: string;
}

export interface AvailabilityTrackingPayload {
  status: PostcodeAvailabilityStatus;
  outwardCode: string | null;
  zoneSlug: string | null;
  intent: string;
  source: string;
}

export interface PostcodeAvailabilityResult {
  normalizedPostcode: string;
  outwardCode: string | null;
  status: PostcodeAvailabilityStatus;
  matchedZone: MatchedZoneSummary | null;
  nearestCoverageZone: MatchedZoneSummary | null;
  estimatedResponseTimeLabel: string;
  callOutFeePence: number | null;
  suggestedAction: SuggestedAction;
  trackingPayload: AvailabilityTrackingPayload;
}

export interface PostcodeAvailabilityErrorCode {
  code:
    | 'INVALID_POSTCODE'
    | 'EMPTY_POSTCODE'
    | 'UNSUPPORTED_REGION'
    | 'SERVER_ERROR'
    | 'INVALID_JSON';
  message: string;
}

export type AvailabilityApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: PostcodeAvailabilityErrorCode };
