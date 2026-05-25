/**
 * Auto-save quote progress.
 *
 * Stores a small, non-sensitive snapshot of the customer's quote-flow state
 * in `localStorage` so a refresh, accidental close, or back-navigation does
 * not lose their progress. We deliberately do NOT store anything
 * payment-related (no client secrets, no card data, no tokens, no JWTs).
 *
 * v2 schema (Phase 7):
 *   { version: 2, step, address, tyre, updatedAt }
 *
 * The previous v1 shape (vehicle/triage/emergency) is incompatible — old
 * snapshots are silently dropped on read.
 */

import type { CapturedLocation } from '@/types/quote';
import type { QuoteStep } from '@/lib/quote/steps';

const STORAGE_KEY = 'tyrerepair:quote-progress:v2';
const TTL_MS = 30 * 60 * 1000;
const SCHEMA_VERSION = 2 as const;

export type LockingWheelNutStatus = 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY';

/** Minimum tyre identity we re-hydrate from storage. The full TyreOption is
 * re-fetched on demand because stock changes frequently. */
export interface PersistedTyreSelection {
  id: string;
  brand: string;
  model: string;
  price: number;
}

export interface PersistedTyre {
  size: string | null;
  selected: PersistedTyreSelection | null;
  lockingWheelNutStatus: LockingWheelNutStatus | null;
}

export interface QuoteProgressSnapshot {
  version: typeof SCHEMA_VERSION;
  step: QuoteStep;
  address: CapturedLocation | null;
  tyre: PersistedTyre;
  updatedAt: number;
}

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isQuoteProgressExpired(snapshot: QuoteProgressSnapshot): boolean {
  if (typeof snapshot.updatedAt !== 'number') return true;
  return Date.now() - snapshot.updatedAt > TTL_MS;
}

export function saveQuoteProgress(
  input: Omit<QuoteProgressSnapshot, 'updatedAt' | 'version'>,
): void {
  const storage = safeStorage();
  if (!storage) return;
  const snapshot: QuoteProgressSnapshot = {
    ...input,
    version: SCHEMA_VERSION,
    updatedAt: Date.now(),
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota / serialisation errors — progress is a nicety, not critical
  }
}

export function loadQuoteProgress(): QuoteProgressSnapshot | null {
  const storage = safeStorage();
  if (!storage) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Partial<QuoteProgressSnapshot>;
  if (obj.version !== SCHEMA_VERSION) {
    // Different shape — clear and ignore (no in-place migration).
    clearQuoteProgress();
    return null;
  }
  if (typeof obj.updatedAt !== 'number') return null;
  if (typeof obj.step !== 'string' || !obj.tyre || typeof obj.tyre !== 'object') {
    return null;
  }
  const snapshot = obj as QuoteProgressSnapshot;
  if (isQuoteProgressExpired(snapshot)) {
    clearQuoteProgress();
    return null;
  }
  return snapshot;
}

export function clearQuoteProgress(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
