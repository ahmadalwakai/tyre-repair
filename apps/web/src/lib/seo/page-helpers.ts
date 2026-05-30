import type { Metadata } from 'next';
import { buildSeoMetadata, buildNoIndexMetadata } from './metadata';
import { getEffectiveSeoForPath } from './overrides';
import { getSeoPageDefaults } from './pages-registry';
import type { SeoPageEffective } from './recommendations';

/**
 * Build Next.js `Metadata` for a registered admin-editable page using its
 * effective (override ?? default) SEO values. Falls back to the in-code
 * defaults if the DB is unreachable.
 */
export async function generateAdminEditableMetadata(path: string): Promise<Metadata> {
  const effective = (await getEffectiveSeoForPath(path)) ?? defaultEffectiveOrThrow(path);
  const input = {
    title: effective.title,
    description: effective.description,
    path,
    keywords: effective.keywords,
  };
  return effective.noindex ? buildNoIndexMetadata(input) : buildSeoMetadata(input);
}

/**
 * Return the effective SEO values (override ?? default) for a registered page,
 * or null when the path is not in the registry.
 */
export async function getEffectiveSeoOrDefaults(path: string): Promise<SeoPageEffective | null> {
  const effective = await getEffectiveSeoForPath(path);
  if (effective) return effective;
  const defaults = getSeoPageDefaults(path);
  if (!defaults) return null;
  return {
    path,
    label: defaults.label,
    title: defaults.title,
    description: defaults.description,
    h1: defaults.h1,
    intro: defaults.intro,
    keywords: [...defaults.keywords],
    noindex: false,
  };
}

function defaultEffectiveOrThrow(path: string): SeoPageEffective {
  const defaults = getSeoPageDefaults(path);
  if (!defaults) {
    throw new Error(`No SEO registry entry for path: ${path}`);
  }
  return {
    path,
    label: defaults.label,
    title: defaults.title,
    description: defaults.description,
    h1: defaults.h1,
    intro: defaults.intro,
    keywords: [...defaults.keywords],
    noindex: false,
  };
}
