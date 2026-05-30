import 'server-only';
import { db, schema, eq } from '@tyrerepair/db';
import { SEO_PAGE_REGISTRY, getSeoPageDefaults } from './pages-registry';
import { evaluateSeoPage } from './recommendations';
import type {
  SeoPageDefaults,
  SeoPageEffective,
  SeoPageHealth,
} from './recommendations';

/**
 * DB-backed SEO override loader.
 *
 * Effective value = override (DB row) ?? default (registry entry).
 * 60-second in-process cache keeps page renders cheap.
 */

export interface SeoPageOverride {
  path: string;
  label: string | null;
  title: string | null;
  description: string | null;
  h1: string | null;
  intro: string | null;
  keywords: string[];
  noindex: boolean;
  notes: string | null;
  updatedAt: string;
}

interface CacheEntry {
  overrides: Map<string, SeoPageOverride>;
  loadedAt: number;
}
let cache: CacheEntry | null = null;
const TTL_MS = 60_000;

export function clearSeoOverridesCache(): void {
  cache = null;
}

function rowToOverride(r: typeof schema.seoPageSettings.$inferSelect): SeoPageOverride {
  return {
    path: r.path,
    label: r.label ?? null,
    title: r.title ?? null,
    description: r.description ?? null,
    h1: r.h1 ?? null,
    intro: r.intro ?? null,
    keywords: Array.isArray(r.keywords) ? (r.keywords as unknown[]).map(String) : [],
    noindex: r.noindex,
    notes: r.notes ?? null,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  };
}

async function loadOverrides(): Promise<Map<string, SeoPageOverride>> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < TTL_MS) return cache.overrides;
  try {
    const rows = await db.select().from(schema.seoPageSettings);
    const map = new Map<string, SeoPageOverride>();
    for (const r of rows) map.set(r.path, rowToOverride(r));
    cache = { overrides: map, loadedAt: now };
    return map;
  } catch {
    const empty = new Map<string, SeoPageOverride>();
    cache = { overrides: empty, loadedAt: now };
    return empty;
  }
}

function mergeEffective(
  defaults: SeoPageDefaults,
  override: SeoPageOverride | undefined,
): SeoPageEffective {
  const ov = override;
  return {
    path: defaults.path,
    label: ov?.label?.trim() || defaults.label,
    title: ov?.title?.trim() || defaults.title,
    description: ov?.description?.trim() || defaults.description,
    h1: ov?.h1?.trim() || defaults.h1,
    intro: ov?.intro?.trim() || defaults.intro,
    keywords: ov && ov.keywords.length > 0 ? ov.keywords : [...defaults.keywords],
    noindex: ov?.noindex ?? false,
  };
}

export async function getEffectiveSeoForPath(
  path: string,
): Promise<SeoPageEffective | null> {
  const defaults = getSeoPageDefaults(path);
  if (!defaults) return null;
  const overrides = await loadOverrides();
  return mergeEffective(defaults, overrides.get(path));
}

export interface SeoPageAdminRow {
  effective: SeoPageEffective;
  defaults: SeoPageDefaults;
  override: SeoPageOverride | null;
  health: SeoPageHealth;
}

export async function listSeoPagesForAdmin(): Promise<SeoPageAdminRow[]> {
  const overrides = await loadOverrides();
  return SEO_PAGE_REGISTRY.map((defaults) => {
    const override = overrides.get(defaults.path) ?? null;
    const effective = mergeEffective(defaults, override ?? undefined);
    const health = evaluateSeoPage(effective);
    return { effective, defaults, override, health };
  });
}

export async function getSeoPageForAdmin(path: string): Promise<SeoPageAdminRow | null> {
  const defaults = getSeoPageDefaults(path);
  if (!defaults) return null;
  const overrides = await loadOverrides();
  const override = overrides.get(path) ?? null;
  const effective = mergeEffective(defaults, override ?? undefined);
  return { effective, defaults, override, health: evaluateSeoPage(effective) };
}

export interface SeoPageWritePatch {
  title?: string | null;
  description?: string | null;
  h1?: string | null;
  intro?: string | null;
  keywords?: string[] | null;
  noindex?: boolean | null;
  notes?: string | null;
}

export async function upsertSeoPageOverride(
  path: string,
  patch: SeoPageWritePatch,
): Promise<SeoPageAdminRow | null> {
  const defaults = getSeoPageDefaults(path);
  if (!defaults) return null;

  const overrides = await loadOverrides();
  const prev = overrides.get(path);

  const next: Record<string, unknown> = {
    path,
    label: defaults.label,
    title: patch.title !== undefined ? patch.title : prev?.title ?? null,
    description:
      patch.description !== undefined ? patch.description : prev?.description ?? null,
    h1: patch.h1 !== undefined ? patch.h1 : prev?.h1 ?? null,
    intro: patch.intro !== undefined ? patch.intro : prev?.intro ?? null,
    keywords:
      patch.keywords !== undefined
        ? (patch.keywords ?? [])
        : prev?.keywords ?? [],
    noindex: patch.noindex !== undefined ? Boolean(patch.noindex) : prev?.noindex ?? false,
    notes: patch.notes !== undefined ? patch.notes : prev?.notes ?? null,
  };

  await db
    .insert(schema.seoPageSettings)
    .values(next as typeof schema.seoPageSettings.$inferInsert)
    .onConflictDoUpdate({
      target: schema.seoPageSettings.path,
      set: {
        title: next.title as string | null,
        description: next.description as string | null,
        h1: next.h1 as string | null,
        intro: next.intro as string | null,
        keywords: next.keywords as unknown as Record<string, unknown>,
        noindex: next.noindex as boolean,
        notes: next.notes as string | null,
        updatedAt: new Date(),
      },
    });

  clearSeoOverridesCache();
  return getSeoPageForAdmin(path);
}

export async function resetSeoPageOverride(path: string): Promise<SeoPageAdminRow | null> {
  const defaults = getSeoPageDefaults(path);
  if (!defaults) return null;
  await db.delete(schema.seoPageSettings).where(eq(schema.seoPageSettings.path, path));
  clearSeoOverridesCache();
  return getSeoPageForAdmin(path);
}
