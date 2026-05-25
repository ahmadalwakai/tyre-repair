/**
 * Admin Stability & Field Operations Pack — Part 2
 * Offline-safe Outbox.
 *
 * Queues SAFE actions only. Dangerous financial/booking/stock actions are
 * NEVER queued; they must be retried by the human admin once online.
 *
 * Storage: expo-secure-store (already a dependency). Items are stored as a
 * single JSON list under one key. We keep the list small (max 50 items) to
 * stay well under SecureStore's per-value limit on Android.
 *
 * Never persisted: JWT, payment secrets, Stripe client secrets.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiPost } from '@/lib/api/client';

const STORAGE_KEY = 'admin_outbox_v1';
const MAX_ITEMS = 50;
const MAX_RETRIES = 5;

/**
 * Allow-list of safe action types. ANY type not in this set is rejected by
 * `enqueueOutboxAction` with `OutboxRefusedError`.
 *
 * Safe actions are read-mostly or low-risk single-row writes that can be
 * deduped on the server side (notes, "mark read"). They never:
 *   - create a booking,
 *   - send a payment/balance/location link,
 *   - change stock,
 *   - apply a pricing override,
 *   - cancel/refund,
 *   - convert assessment to replacement.
 */
export const SAFE_OUTBOX_TYPES = [
  'booking.note.add',
  'notification.mark_read',
  'action_queue.mark_reviewed',
  'ui.local_acknowledge',
] as const;
export type SafeOutboxType = (typeof SAFE_OUTBOX_TYPES)[number];

export const DANGEROUS_OUTBOX_TYPES = [
  'booking.create',
  'booking.cancel',
  'booking.refund',
  'booking.send_payment_link',
  'booking.send_balance_link',
  'booking.send_location_link',
  'booking.send_tracking_link',
  'stock.update',
  'pricing.override',
  'payment.charge',
  'assessment.convert',
] as const;
export type DangerousOutboxType = (typeof DANGEROUS_OUTBOX_TYPES)[number];

export type OutboxStatus = 'pending' | 'retrying' | 'failed' | 'done';

export interface OutboxItem {
  id: string;
  type: SafeOutboxType;
  /** Endpoint path (POST). The outbox calls apiPost(endpoint, payload). */
  endpoint: string;
  /** Human-friendly label for the offline screen. */
  label: string;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  status: OutboxStatus;
  lastError?: string;
}

export class OutboxRefusedError extends Error {
  public readonly reason: 'dangerous' | 'unknown' | 'storage';
  public constructor(reason: 'dangerous' | 'unknown' | 'storage', message: string) {
    super(message);
    this.name = 'OutboxRefusedError';
    this.reason = reason;
  }
}

/**
 * Returns true if the given action type is dangerous and must NEVER be
 * queued automatically. Callers should surface "Internet required for this
 * action." when an attempt is made offline.
 */
export function isDangerousOutboxType(type: string): type is DangerousOutboxType {
  return (DANGEROUS_OUTBOX_TYPES as readonly string[]).includes(type);
}

export function isSafeOutboxType(type: string): type is SafeOutboxType {
  return (SAFE_OUTBOX_TYPES as readonly string[]).includes(type);
}

const isWeb = Platform.OS === 'web';

async function readRaw(): Promise<string | null> {
  try {
    if (isWeb) {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(STORAGE_KEY);
    }
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

async function writeRaw(value: string): Promise<void> {
  if (isWeb) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, value);
}

async function clearRaw(): Promise<void> {
  if (isWeb) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

export async function getOutboxItems(): Promise<OutboxItem[]> {
  const raw = await readRaw();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is OutboxItem => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as OutboxItem).id === 'string' &&
        isSafeOutboxType((item as OutboxItem).type)
      );
    });
  } catch {
    return [];
  }
}

async function saveItems(items: OutboxItem[]): Promise<void> {
  // Cap size; oldest-first eviction.
  const trimmed = items.slice(-MAX_ITEMS);
  await writeRaw(JSON.stringify(trimmed));
}

function generateId(): string {
  return `obx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Enqueue a safe action. Throws OutboxRefusedError for any dangerous or
 * unknown type. Payload must NOT contain secrets, JWTs or payment client
 * secrets — the caller is responsible for not passing them.
 */
export async function enqueueOutboxAction(input: {
  type: SafeOutboxType;
  endpoint: string;
  label: string;
  payload: Record<string, unknown>;
}): Promise<OutboxItem> {
  if (isDangerousOutboxType(input.type)) {
    throw new OutboxRefusedError(
      'dangerous',
      'Internet required for this action.',
    );
  }
  if (!isSafeOutboxType(input.type)) {
    throw new OutboxRefusedError('unknown', 'Unknown action type.');
  }

  // Defensive scrub: drop obvious secret-looking keys before persisting.
  const scrubbed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input.payload)) {
    const key = k.toLowerCase();
    if (
      key.includes('token') ||
      key.includes('secret') ||
      key.includes('password') ||
      key === 'jwt' ||
      key.includes('client_secret')
    ) {
      continue;
    }
    scrubbed[k] = v;
  }

  const item: OutboxItem = {
    id: generateId(),
    type: input.type,
    endpoint: input.endpoint,
    label: input.label,
    payload: scrubbed,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'pending',
  };

  const items = await getOutboxItems();
  items.push(item);
  await saveItems(items);
  return item;
}

export async function discardOutboxItem(id: string): Promise<void> {
  const items = await getOutboxItems();
  await saveItems(items.filter((i) => i.id !== id));
}

export async function clearOutbox(): Promise<void> {
  await clearRaw();
}

export interface FlushResult {
  attempted: number;
  succeeded: number;
  failed: number;
  remaining: number;
}

let flushInFlight: Promise<FlushResult> | null = null;

/**
 * Attempt to send all pending items in order. Re-entrant: parallel callers
 * share the same in-flight promise, so retries are not duplicated.
 */
export async function flushOutbox(): Promise<FlushResult> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = (async () => {
    const items = await getOutboxItems();
    let succeeded = 0;
    let failed = 0;
    const remaining: OutboxItem[] = [];
    for (const item of items) {
      try {
        item.status = 'retrying';
        await apiPost<unknown>(item.endpoint, item.payload);
        succeeded += 1;
        // Drop on success.
      } catch (err) {
        failed += 1;
        item.retryCount += 1;
        item.lastError = err instanceof Error ? err.message : 'Network error';
        item.status = item.retryCount >= MAX_RETRIES ? 'failed' : 'pending';
        remaining.push(item);
      }
    }
    await saveItems(remaining);
    return {
      attempted: items.length,
      succeeded,
      failed,
      remaining: remaining.length,
    };
  })();
  try {
    return await flushInFlight;
  } finally {
    flushInFlight = null;
  }
}
