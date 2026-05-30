import { db, schema, eq } from '@tyrerepair/db';
import type { CoverageZone, CoverageZoneStatus } from '@/types/coverage';

/**
 * Scotland service-area coverage zones.
 *
 * Source of truth for which postcodes a mobile van can dispatch to from the
 * Glasgow HQ. Each entry is a typed, readonly record — there is no DB table
 * for zones yet. When the DB migration pattern is confirmed, this file can
 * be replaced by a Drizzle-backed loader returning the same shape.
 *
 * Rules:
 *   - Represent real service coverage only. No fake branches, no fake
 *     local store addresses.
 *   - `radiusMiles` is operational reach from the zone base postcode.
 *   - `estimatedResponseMinutes*` is a realistic emergency-dispatch window,
 *     not a guaranteed arrival time. Public copy must mirror that wording.
 *   - `callOutFeePence` is GBP in pence; pricing engine remains the final
 *     source of truth for the customer-facing total.
 *
 * Postcode prefix matching is case-insensitive and accepts both full
 * outward codes (e.g. "G1", "EH10") and letters-only area codes (e.g. "G",
 * "EH"). See `lib/coverage/postcode.ts` for the matcher.
 */

const NOW = '2026-05-26T00:00:00.000Z';

export const SCOTLAND_COVERAGE_ZONES: readonly CoverageZone[] = [
  {
    id: 'zone_glasgow',
    name: 'Glasgow & West',
    slug: 'glasgow',
    status: 'active',
    cityOrRegion: 'Glasgow',
    postcodePrefixes: ['G', 'PA', 'ML'],
    basePostcode: 'G31 1PD',
    radiusMiles: 25,
    estimatedResponseMinutesMin: 25,
    estimatedResponseMinutesMax: 45,
    callOutFeePence: 4900,
    availableNow: true,
    availableToday: true,
    availableTomorrow: true,
    dailyCapacity: 24,
    priority: 1,
    notes: 'Home base. Highest priority dispatch zone.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_edinburgh',
    name: 'Edinburgh & Lothians',
    slug: 'edinburgh',
    status: 'active',
    cityOrRegion: 'Edinburgh',
    postcodePrefixes: ['EH'],
    basePostcode: 'EH1 1YZ',
    radiusMiles: 25,
    estimatedResponseMinutesMin: 45,
    estimatedResponseMinutesMax: 75,
    callOutFeePence: 5900,
    availableNow: true,
    availableToday: true,
    availableTomorrow: true,
    dailyCapacity: 14,
    priority: 2,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_aberdeen',
    name: 'Aberdeen & Aberdeenshire',
    slug: 'aberdeen',
    status: 'active',
    cityOrRegion: 'Aberdeen',
    postcodePrefixes: ['AB'],
    basePostcode: 'AB10 1XG',
    radiusMiles: 30,
    estimatedResponseMinutesMin: 90,
    estimatedResponseMinutesMax: 180,
    callOutFeePence: 8900,
    availableNow: false,
    availableToday: true,
    availableTomorrow: true,
    dailyCapacity: 4,
    priority: 5,
    notes: 'Long-distance zone. Confirm pricing manually for puncture-only jobs.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_dundee',
    name: 'Dundee & Angus',
    slug: 'dundee',
    status: 'active',
    cityOrRegion: 'Dundee',
    postcodePrefixes: ['DD'],
    basePostcode: 'DD1 1DG',
    radiusMiles: 20,
    estimatedResponseMinutesMin: 75,
    estimatedResponseMinutesMax: 120,
    callOutFeePence: 7900,
    availableNow: false,
    availableToday: true,
    availableTomorrow: true,
    dailyCapacity: 6,
    priority: 4,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_inverness',
    name: 'Inverness & Highlands',
    slug: 'inverness',
    status: 'active',
    cityOrRegion: 'Inverness',
    postcodePrefixes: ['IV'],
    basePostcode: 'IV1 1QY',
    radiusMiles: 40,
    estimatedResponseMinutesMin: 120,
    estimatedResponseMinutesMax: 240,
    callOutFeePence: 12900,
    availableNow: false,
    availableToday: false,
    availableTomorrow: true,
    dailyCapacity: 2,
    priority: 7,
    notes: 'Highlands. Always confirm price + deposit before dispatch.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_stirling',
    name: 'Stirling & Forth Valley',
    slug: 'stirling',
    status: 'active',
    cityOrRegion: 'Stirling',
    postcodePrefixes: ['FK'],
    basePostcode: 'FK8 1EJ',
    radiusMiles: 20,
    estimatedResponseMinutesMin: 45,
    estimatedResponseMinutesMax: 80,
    callOutFeePence: 5900,
    availableNow: true,
    availableToday: true,
    availableTomorrow: true,
    dailyCapacity: 6,
    priority: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_ayrshire',
    name: 'Ayrshire',
    slug: 'ayrshire',
    status: 'active',
    cityOrRegion: 'Ayrshire',
    postcodePrefixes: ['KA'],
    basePostcode: 'KA1 1AA',
    radiusMiles: 25,
    estimatedResponseMinutesMin: 60,
    estimatedResponseMinutesMax: 100,
    callOutFeePence: 6900,
    availableNow: true,
    availableToday: true,
    availableTomorrow: true,
    dailyCapacity: 6,
    priority: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_fife',
    name: 'Fife',
    slug: 'fife',
    status: 'active',
    cityOrRegion: 'Fife',
    postcodePrefixes: ['KY'],
    basePostcode: 'KY1 1AA',
    radiusMiles: 20,
    estimatedResponseMinutesMin: 60,
    estimatedResponseMinutesMax: 100,
    callOutFeePence: 6900,
    availableNow: true,
    availableToday: true,
    availableTomorrow: true,
    dailyCapacity: 6,
    priority: 4,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_borders',
    name: 'Scottish Borders',
    slug: 'borders',
    status: 'active',
    cityOrRegion: 'Borders',
    postcodePrefixes: ['TD'],
    basePostcode: 'TD1 1AA',
    radiusMiles: 30,
    estimatedResponseMinutesMin: 90,
    estimatedResponseMinutesMax: 180,
    callOutFeePence: 8900,
    availableNow: false,
    availableToday: true,
    availableTomorrow: true,
    dailyCapacity: 3,
    priority: 6,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_dumfries_galloway',
    name: 'Dumfries & Galloway',
    slug: 'dumfries-galloway',
    status: 'active',
    cityOrRegion: 'Dumfries & Galloway',
    postcodePrefixes: ['DG'],
    basePostcode: 'DG1 1AA',
    radiusMiles: 35,
    estimatedResponseMinutesMin: 90,
    estimatedResponseMinutesMax: 180,
    callOutFeePence: 8900,
    availableNow: false,
    availableToday: true,
    availableTomorrow: true,
    dailyCapacity: 3,
    priority: 6,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_perthshire',
    name: 'Perthshire',
    slug: 'perthshire',
    status: 'active',
    cityOrRegion: 'Perth',
    postcodePrefixes: ['PH'],
    basePostcode: 'PH1 5EJ',
    radiusMiles: 25,
    estimatedResponseMinutesMin: 75,
    estimatedResponseMinutesMax: 140,
    callOutFeePence: 7900,
    availableNow: false,
    availableToday: true,
    availableTomorrow: true,
    dailyCapacity: 4,
    priority: 5,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_outer_hebrides',
    name: 'Outer Hebrides',
    slug: 'outer-hebrides',
    status: 'unavailable',
    cityOrRegion: 'Outer Hebrides',
    postcodePrefixes: ['HS'],
    basePostcode: 'HS1 2BG',
    radiusMiles: 0,
    estimatedResponseMinutesMin: 0,
    estimatedResponseMinutesMax: 0,
    callOutFeePence: 0,
    availableNow: false,
    availableToday: false,
    availableTomorrow: false,
    dailyCapacity: 0,
    priority: 99,
    notes: 'Island region. Not currently dispatching.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_orkney_caithness',
    name: 'Orkney & Caithness',
    slug: 'orkney-caithness',
    status: 'unavailable',
    cityOrRegion: 'Orkney & Caithness',
    postcodePrefixes: ['KW'],
    basePostcode: 'KW1 4AB',
    radiusMiles: 0,
    estimatedResponseMinutesMin: 0,
    estimatedResponseMinutesMax: 0,
    callOutFeePence: 0,
    availableNow: false,
    availableToday: false,
    availableTomorrow: false,
    dailyCapacity: 0,
    priority: 99,
    notes: 'Island / far-north region. Not currently dispatching.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'zone_shetland',
    name: 'Shetland',
    slug: 'shetland',
    status: 'unavailable',
    cityOrRegion: 'Shetland',
    postcodePrefixes: ['ZE'],
    basePostcode: 'ZE1 0AA',
    radiusMiles: 0,
    estimatedResponseMinutesMin: 0,
    estimatedResponseMinutesMax: 0,
    callOutFeePence: 0,
    availableNow: false,
    availableToday: false,
    availableTomorrow: false,
    dailyCapacity: 0,
    priority: 99,
    notes: 'Island region. Not currently dispatching.',
    createdAt: NOW,
    updatedAt: NOW,
  },
] as const;

export function getZoneBySlugSync(slug: string): CoverageZone | null {
  const needle = slug.toLowerCase();
  return SCOTLAND_COVERAGE_ZONES.find((z) => z.slug === needle) ?? null;
}

export function getActiveZonesSync(): readonly CoverageZone[] {
  return SCOTLAND_COVERAGE_ZONES.filter((z) => z.status === 'active');
}

/* -------------------------------------------------------------------------- */
/* DB-backed loader (source of truth)                                         */
/*                                                                            */
/* Zones live in the `coverage_zones` table (see                              */
/* `packages/db/scripts/apply-coverage-zones.mjs`). The hard-coded            */
/* `SCOTLAND_COVERAGE_ZONES` array above is the build/offline fallback so     */
/* SEO landing pages never crash when DATABASE_URL is missing or the DB is   */
/* temporarily unreachable.                                                   */
/* -------------------------------------------------------------------------- */

interface CacheEntry {
  zones: readonly CoverageZone[];
  loadedAt: number;
}
let cache: CacheEntry | null = null;
const TTL_MS = 60_000;

export function clearCoverageZonesCache(): void {
  cache = null;
}

function toIso(value: Date | string | null | undefined): string {
  if (!value) return NOW;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function rowToZone(r: typeof schema.coverageZones.$inferSelect): CoverageZone {
  const zone: CoverageZone = {
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status as CoverageZoneStatus,
    cityOrRegion: r.cityOrRegion,
    postcodePrefixes: Array.isArray(r.postcodePrefixes)
      ? (r.postcodePrefixes as unknown[]).map((s) => String(s).toUpperCase())
      : [],
    basePostcode: r.basePostcode,
    radiusMiles: r.radiusMiles,
    estimatedResponseMinutesMin: r.estimatedResponseMinutesMin,
    estimatedResponseMinutesMax: r.estimatedResponseMinutesMax,
    callOutFeePence: r.callOutFeePence,
    availableNow: r.availableNow,
    availableToday: r.availableToday,
    availableTomorrow: r.availableTomorrow,
    dailyCapacity: r.dailyCapacity,
    priority: r.priority,
    createdAt: toIso(r.createdAt),
    updatedAt: toIso(r.updatedAt),
  } as CoverageZone;
  if (r.notes != null) {
    (zone as { notes?: string }).notes = r.notes;
  }
  return zone;
}

async function loadZones(): Promise<readonly CoverageZone[]> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < TTL_MS) return cache.zones;
  try {
    const rows = await db.select().from(schema.coverageZones);
    if (rows.length === 0) {
      cache = { zones: SCOTLAND_COVERAGE_ZONES, loadedAt: now };
      return SCOTLAND_COVERAGE_ZONES;
    }
    const zones = rows.map(rowToZone);
    cache = { zones, loadedAt: now };
    return zones;
  } catch {
    cache = { zones: SCOTLAND_COVERAGE_ZONES, loadedAt: now };
    return SCOTLAND_COVERAGE_ZONES;
  }
}

export async function getAllZones(): Promise<readonly CoverageZone[]> {
  return loadZones();
}

export async function getActiveZones(): Promise<readonly CoverageZone[]> {
  const zones = await loadZones();
  return zones.filter((z) => z.status === 'active');
}

export async function getZoneBySlug(slug: string): Promise<CoverageZone | null> {
  const needle = slug.toLowerCase();
  const zones = await loadZones();
  return zones.find((z) => z.slug === needle) ?? null;
}

/** Used by `lib/coverage/availability.ts` for postcode-to-zone matching. */
export async function getZonesForMatching(): Promise<readonly CoverageZone[]> {
  return loadZones();
}

/* -------------------------------------------------------------------------- */
/* Admin mutations — invalidate cache so changes show immediately.            */
/* -------------------------------------------------------------------------- */

export interface CoverageZoneWriteInput {
  slug: string;
  name: string;
  status: CoverageZoneStatus;
  cityOrRegion: string;
  postcodePrefixes: string[];
  basePostcode: string;
  radiusMiles: number;
  estimatedResponseMinutesMin: number;
  estimatedResponseMinutesMax: number;
  callOutFeePence: number;
  availableNow: boolean;
  availableToday: boolean;
  availableTomorrow: boolean;
  dailyCapacity: number;
  priority: number;
  notes?: string | null;
}

function normalizePrefixes(values: string[]): string[] {
  return values
    .map((s) => String(s ?? '').trim().toUpperCase())
    .filter((s) => s.length > 0);
}

export async function createCoverageZone(input: CoverageZoneWriteInput): Promise<CoverageZone> {
  const inserted = await db
    .insert(schema.coverageZones)
    .values({
      slug: input.slug,
      name: input.name,
      status: input.status,
      cityOrRegion: input.cityOrRegion,
      postcodePrefixes: normalizePrefixes(input.postcodePrefixes) as unknown as Record<
        string,
        unknown
      >,
      basePostcode: input.basePostcode,
      radiusMiles: input.radiusMiles,
      estimatedResponseMinutesMin: input.estimatedResponseMinutesMin,
      estimatedResponseMinutesMax: input.estimatedResponseMinutesMax,
      callOutFeePence: input.callOutFeePence,
      availableNow: input.availableNow,
      availableToday: input.availableToday,
      availableTomorrow: input.availableTomorrow,
      dailyCapacity: input.dailyCapacity,
      priority: input.priority,
      notes: input.notes ?? null,
    })
    .returning();
  clearCoverageZonesCache();
  const row = inserted[0];
  if (!row) throw new Error('Failed to insert coverage zone');
  return rowToZone(row);
}

export async function updateCoverageZone(
  id: string,
  patch: Partial<CoverageZoneWriteInput>,
): Promise<CoverageZone | null> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.slug !== undefined) updates.slug = patch.slug;
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.cityOrRegion !== undefined) updates.cityOrRegion = patch.cityOrRegion;
  if (patch.postcodePrefixes !== undefined)
    updates.postcodePrefixes = normalizePrefixes(patch.postcodePrefixes);
  if (patch.basePostcode !== undefined) updates.basePostcode = patch.basePostcode;
  if (patch.radiusMiles !== undefined) updates.radiusMiles = patch.radiusMiles;
  if (patch.estimatedResponseMinutesMin !== undefined)
    updates.estimatedResponseMinutesMin = patch.estimatedResponseMinutesMin;
  if (patch.estimatedResponseMinutesMax !== undefined)
    updates.estimatedResponseMinutesMax = patch.estimatedResponseMinutesMax;
  if (patch.callOutFeePence !== undefined) updates.callOutFeePence = patch.callOutFeePence;
  if (patch.availableNow !== undefined) updates.availableNow = patch.availableNow;
  if (patch.availableToday !== undefined) updates.availableToday = patch.availableToday;
  if (patch.availableTomorrow !== undefined) updates.availableTomorrow = patch.availableTomorrow;
  if (patch.dailyCapacity !== undefined) updates.dailyCapacity = patch.dailyCapacity;
  if (patch.priority !== undefined) updates.priority = patch.priority;
  if (patch.notes !== undefined) updates.notes = patch.notes;

  const rows = await db
    .update(schema.coverageZones)
    .set(updates)
    .where(eq(schema.coverageZones.id, id))
    .returning();
  clearCoverageZonesCache();
  const row = rows[0];
  return row ? rowToZone(row) : null;
}

export async function deleteCoverageZone(id: string): Promise<boolean> {
  const rows = await db
    .delete(schema.coverageZones)
    .where(eq(schema.coverageZones.id, id))
    .returning({ id: schema.coverageZones.id });
  clearCoverageZonesCache();
  return rows.length > 0;
}
