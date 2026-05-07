/**
 * Phase 11 — Auto-save quote progress.
 *
 * Stores a small, non-sensitive snapshot of the customer's quote-flow state in
 * `localStorage` so a refresh, accidental close, or back-navigation does not lose
 * their progress. We deliberately do NOT store anything payment-related (no
 * client secrets, no card data, no tokens, no JWTs).
 */

import type { CapturedLocation, QuoteJobType, TyreProblemType } from '@/types/quote';

const STORAGE_KEY = 'tyrerepair:quote-progress:v1';
const TTL_MS = 30 * 60 * 1000;

export interface QuoteProgressVehicle {
  registration: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  manualTyreSize: string | null;
}

export interface QuoteProgressSnapshot {
  vehicle: QuoteProgressVehicle | null;
  tyreProblemType: TyreProblemType | null;
  jobType: QuoteJobType | null;
  selectedTyreId: string | null;
  backupTyreId: string | null;
  location: CapturedLocation | null;
  isEmergencyAssistMode: boolean;
  /** Reference id returned from POST /api/lead-events/emergency-assist. Allows
   * follow-up location updates to target the same admin popup/lead. */
  emergencyAssistEventId: string | null;
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

export function saveQuoteProgress(input: Omit<QuoteProgressSnapshot, 'updatedAt'>): void {
  const storage = safeStorage();
  if (!storage) return;
  const snapshot: QuoteProgressSnapshot = { ...input, updatedAt: Date.now() };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota/serialisation errors — progress is a nicety, not critical
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
  const snapshot = parsed as QuoteProgressSnapshot;
  if (typeof snapshot.updatedAt !== 'number') return null;
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
