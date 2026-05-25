/**
 * Sound policy for the unified incoming-leads queue.
 *
 * Goal: alert the admin reliably for the FIRST urgent lead, but never
 * stress them by re-playing the full alert sound for every follow-up
 * lead/location update inside a short cooldown window.
 *
 * No new dependencies. No new asset. Respects the existing
 * `soundEnabled` admin preference at the call site.
 */

import type { IncomingLead } from '@/types/incoming-leads';

export const FULL_SOUND_COOLDOWN_MS = 15_000;
export const SOFT_SIGNAL_COOLDOWN_MS = 4_000;

export interface ShouldPlayInput {
  lastLeadSoundAt: number | null;
  incomingLead: IncomingLead;
  activeLead: IncomingLead | null;
  queueCount: number;
  now?: number;
}

/**
 * Returns true if the full looping/alert sound should play for this lead.
 *
 * Rules:
 *  - First urgent lead always plays.
 *  - If a lead arrived within the cooldown window, suppress the full sound.
 *  - A CRITICAL lead may still bypass the cooldown if the previous sound
 *    was at least half the cooldown ago (so we never spam, but we also
 *    never miss a clearly more urgent lead).
 *  - Expired leads never play.
 *  - Re-renders of the same active lead (id match) never play.
 */
export function shouldPlayFullLeadSound(input: ShouldPlayInput): boolean {
  const { lastLeadSoundAt, incomingLead, activeLead } = input;
  const now = input.now ?? Date.now();
  if (incomingLead.status === 'EXPIRED') return false;
  if (activeLead && activeLead.id === incomingLead.id) return false;
  if (lastLeadSoundAt === null) return true;
  const elapsed = now - lastLeadSoundAt;
  if (elapsed >= FULL_SOUND_COOLDOWN_MS) return true;
  if (incomingLead.priority === 'CRITICAL' && elapsed >= FULL_SOUND_COOLDOWN_MS / 2) {
    return true;
  }
  return false;
}

/**
 * Returns true if a soft, short signal would be appropriate.
 * The provider uses this only as a hint — if no soft asset exists,
 * the visual queue badge is enough.
 */
export function shouldPlaySoftLeadSignal(input: {
  lastLeadSoundAt: number | null;
  now?: number;
}): boolean {
  if (input.lastLeadSoundAt === null) return false;
  const now = input.now ?? Date.now();
  return now - input.lastLeadSoundAt >= SOFT_SIGNAL_COOLDOWN_MS;
}
