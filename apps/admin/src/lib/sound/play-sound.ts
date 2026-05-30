import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

/**
 * Generic sound system for the admin app.
 *
 * Builds on top of the existing `lib/notifications/sound.ts` (which is
 * dedicated to the admin-alert push channel). This module is for *UI
 * feedback* sounds: toasts, button confirmations, status changes, etc.
 *
 * Asset registry maps a logical key to a `require()`d audio module.
 * Every key currently defaults to the bundled `admin-alert.mp3` until
 * the owner records / sources the per-event files. Replace the right
 * side of the map as files become available — no other code changes
 * needed.
 *
 * Required files (place under `apps/admin/assets/sounds/`):
 *   - incoming_call.mp3     — phone-ring loop, 2-3 s
 *   - emergency_alert.mp3   — soft siren loop
 *   - new_booking.mp3       — "kerching" / chime, < 1.5 s
 *   - payment_received.mp3  — short chime, < 1 s
 *   - urgent_action.mp3     — pulse, < 1 s
 *   - callback_request.mp3  — soft ping, < 1 s
 *   - toast_success.mp3     — tick,    < 300 ms
 *   - toast_error.mp3       — buzz,    < 300 ms
 *   - toast_info.mp3        — blip,    < 300 ms
 *   - toast_warning.mp3     — double tick, < 300 ms
 *   - status_advance.mp3    — swoosh,  < 400 ms
 *   - sms_sent.mp3          — whoosh,  < 400 ms
 *   - note_saved.mp3        — typewriter click, < 200 ms
 *   - offline_drop.mp3      — descending tone
 *   - online_back.mp3       — ascending tone
 *   - session_expired.mp3   — warning chime
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fallback = require('../../../assets/sounds/admin_alert.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const loginOk = require('../../../assets/sounds/login-success.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const emergencyAlert = require('../../../assets/sounds/emergency_alert.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const newBooking = require('../../../assets/sounds/new_booking.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const paymentReceived = require('../../../assets/sounds/payment_received.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const urgentAction = require('../../../assets/sounds/urgent_action.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const screenChange = require('../../../assets/sounds/screen_change.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const callbackRequest = require('../../../assets/sounds/callback_request.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const toastSuccess = require('../../../assets/sounds/toast_success.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const toastError = require('../../../assets/sounds/toast_error.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const toastInfo = require('../../../assets/sounds/toast_info.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const toastWarning = require('../../../assets/sounds/toast_warning.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const statusAdvance = require('../../../assets/sounds/status_advance.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const smsSent = require('../../../assets/sounds/sms_sent.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const noteSaved = require('../../../assets/sounds/note_saved.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const offlineDrop = require('../../../assets/sounds/offline_drop.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const onlineBack = require('../../../assets/sounds/online_back.mp3') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sessionExpired = require('../../../assets/sounds/session_expired.mp3') as number;

export type SoundKey =
  | 'incoming_call'
  | 'emergency_alert'
  | 'new_booking'
  | 'payment_received'
  | 'urgent_action'
  | 'callback_request'
  | 'toast_success'
  | 'toast_error'
  | 'toast_info'
  | 'toast_warning'
  | 'status_advance'
  | 'sms_sent'
  | 'note_saved'
  | 'offline_drop'
  | 'online_back'
  | 'session_expired'
  | 'screen_change';

/**
 * Each sound key maps to a bundled asset module returned by `require()`.
 * Until the owner records the per-event files, success-flavoured cues
 * play `login-success.mp3` and warning/error/critical cues play
 * `admin-alert.mp3`. Sounds are deduplicated by module identity inside
 * the cache, so re-using the same file across keys has no extra cost.
 */
const REGISTRY: Record<SoundKey, number> = {
  incoming_call: fallback,
  emergency_alert: emergencyAlert,
  new_booking: newBooking,
  payment_received: paymentReceived,
  urgent_action: urgentAction,
  callback_request: callbackRequest,
  toast_success: toastSuccess,
  toast_error: toastError,
  toast_info: toastInfo,
  toast_warning: toastWarning,
  status_advance: statusAdvance,
  sms_sent: smsSent,
  note_saved: noteSaved,
  offline_drop: offlineDrop,
  online_back: onlineBack,
  session_expired: sessionExpired,
  screen_change: screenChange,
};

interface CacheEntry {
  sound: Audio.Sound;
  loop: boolean;
}

const cache: Map<number, CacheEntry> = new Map();
let audioModeConfigured = false;
let uiFeedbackEnabled = true;

// --- Web-specific HTMLAudioElement path ----------------------------------
// expo-av's web shim is unreliable for looping + autoplay-unlock semantics.
// On web we use HTMLAudioElement directly. We pre-create + prime each cached
// element inside the first user-gesture handler so the browser keeps the
// "user activated" flag for subsequent .play() calls.
const IS_WEB = Platform.OS === 'web' && typeof document !== 'undefined';
const webAudioByKey: Map<SoundKey, HTMLAudioElement> = new Map();
let webAudioUnlocked = !IS_WEB;
const pendingLoopKeys = new Set<SoundKey>();
const pendingOneShotKeys = new Set<SoundKey>();

export function isWebAudioUnlocked(): boolean {
  return webAudioUnlocked;
}

function resolveAssetUri(asset: number): string | null {
  try {
    const a = Asset.fromModule(asset);
    return a.uri ?? a.localUri ?? null;
  } catch {
    return null;
  }
}

function ensureWebAudio(key: SoundKey): HTMLAudioElement | null {
  if (!IS_WEB) return null;
  const existing = webAudioByKey.get(key);
  if (existing) return existing;
  const uri = resolveAssetUri(REGISTRY[key]);
  if (!uri) return null;
  const el = new window.Audio(uri);
  el.preload = 'auto';
  webAudioByKey.set(key, el);
  return el;
}

function unlockFromGesture(): void {
  if (!IS_WEB) return;
  if (webAudioUnlocked) return;
  webAudioUnlocked = true;
  document.removeEventListener('pointerdown', unlockFromGesture, true);
  document.removeEventListener('keydown', unlockFromGesture, true);
  document.removeEventListener('touchstart', unlockFromGesture, true);
  // Prime every known sound element inside the gesture so the browser
  // marks them as user-activated for future programmatic play() calls.
  for (const key of Object.keys(REGISTRY) as SoundKey[]) {
    const el = ensureWebAudio(key);
    if (!el) continue;
    const audioEl = el;
    audioEl.muted = true;
    const p = audioEl.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        audioEl.pause();
        audioEl.currentTime = 0;
        audioEl.muted = false;
      }).catch(() => {
        audioEl.muted = false;
      });
    } else {
      try { audioEl.pause(); } catch { /* ignore */ }
      audioEl.muted = false;
    }
  }
  // Replay any loops / one-shots that were requested before the unlock.
  const queuedLoops = Array.from(pendingLoopKeys);
  pendingLoopKeys.clear();
  for (const k of queuedLoops) {
    void playSoundLoop(k);
  }
  const queuedShots = Array.from(pendingOneShotKeys);
  pendingOneShotKeys.clear();
  for (const k of queuedShots) {
    void playSound(k);
  }
}

if (IS_WEB) {
  document.addEventListener('pointerdown', unlockFromGesture, true);
  document.addEventListener('keydown', unlockFromGesture, true);
  document.addEventListener('touchstart', unlockFromGesture, true);
}

async function configureAudioModeOnce(): Promise<void> {
  if (audioModeConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      playThroughEarpieceAndroid: false,
    });
    audioModeConfigured = true;
  } catch {
    // Best-effort: configuration is not critical for UI feedback to work.
  }
}

async function ensure(asset: number): Promise<Audio.Sound | null> {
  const hit = cache.get(asset);
  if (hit) return hit.sound;
  await configureAudioModeOnce();
  try {
    const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: false });
    cache.set(asset, { sound, loop: false });
    return sound;
  } catch {
    return null;
  }
}

export function setUiFeedbackEnabled(enabled: boolean): void {
  uiFeedbackEnabled = enabled;
}

export function getUiFeedbackEnabled(): boolean {
  return uiFeedbackEnabled;
}

/**
 * Play a one-shot UI feedback sound. Silently no-ops on unsupported
 * platforms or if UI feedback is disabled.
 */
export async function playSound(
  key: SoundKey,
  options: { volume?: number } = {},
): Promise<void> {
  if (!uiFeedbackEnabled) return;
  if (Platform.OS !== 'android' && Platform.OS !== 'ios' && Platform.OS !== 'web') return;
  if (IS_WEB) {
    if (!webAudioUnlocked) {
      pendingOneShotKeys.add(key);
      return;
    }
    const el = ensureWebAudio(key);
    if (!el) {
      console.warn('[play-sound] no web audio element for', key);
      return;
    }
    try {
      el.loop = false;
      if (options.volume !== undefined) {
        el.volume = Math.max(0, Math.min(1, options.volume));
      }
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err: unknown) => {
          console.warn('[play-sound] web play() rejected for', key, err);
          // Re-arm: next user gesture will drain the pending queue.
          if ((err as { name?: string } | null)?.name === 'NotAllowedError') {
            webAudioUnlocked = false;
            pendingOneShotKeys.add(key);
            document.addEventListener('pointerdown', unlockFromGesture, true);
            document.addEventListener('keydown', unlockFromGesture, true);
            document.addEventListener('touchstart', unlockFromGesture, true);
          }
        });
      }
    } catch (err) {
      console.warn('[play-sound] web play threw for', key, err);
    }
    return;
  }
  const asset = REGISTRY[key];
  const sound = await ensure(asset);
  if (!sound) return;
  try {
    const entry = cache.get(asset);
    if (entry?.loop) {
      await sound.setIsLoopingAsync(false);
      if (entry) entry.loop = false;
    }
    if (options.volume !== undefined) {
      await sound.setVolumeAsync(Math.max(0, Math.min(1, options.volume)));
    }
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // ignore
  }
}

/**
 * Start a looping sound (e.g. incoming call). Caller must invoke
 * {@link stopSound} with the same key when the trigger ends.
 */
export async function playSoundLoop(key: SoundKey): Promise<void> {
  if (!uiFeedbackEnabled) return;
  if (Platform.OS !== 'android' && Platform.OS !== 'ios' && Platform.OS !== 'web') return;
  if (IS_WEB) {
    if (!webAudioUnlocked) {
      pendingLoopKeys.add(key);
      return;
    }
    const el = ensureWebAudio(key);
    if (!el) {
      console.warn('[play-sound] no web audio element for loop', key);
      return;
    }
    try {
      el.loop = true;
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err: unknown) => {
          console.warn('[play-sound] web loop play() rejected for', key, err);
          if ((err as { name?: string } | null)?.name === 'NotAllowedError') {
            webAudioUnlocked = false;
            pendingLoopKeys.add(key);
            document.addEventListener('pointerdown', unlockFromGesture, true);
            document.addEventListener('keydown', unlockFromGesture, true);
            document.addEventListener('touchstart', unlockFromGesture, true);
          }
        });
      }
    } catch (err) {
      console.warn('[play-sound] web loop play threw for', key, err);
    }
    return;
  }
  const asset = REGISTRY[key];
  const sound = await ensure(asset);
  if (!sound) return;
  try {
    await sound.setIsLoopingAsync(true);
    const entry = cache.get(asset);
    if (entry) entry.loop = true;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // ignore
  }
}

export async function stopSound(key: SoundKey): Promise<void> {
  pendingLoopKeys.delete(key);
  if (IS_WEB) {
    const el = webAudioByKey.get(key);
    if (!el) return;
    try {
      el.pause();
      el.loop = false;
      el.currentTime = 0;
    } catch {
      // ignore
    }
    return;
  }
  const asset = REGISTRY[key];
  const entry = cache.get(asset);
  if (!entry) return;
  try {
    await entry.sound.stopAsync();
    await entry.sound.setIsLoopingAsync(false);
    entry.loop = false;
  } catch {
    // ignore
  }
}

/** Unload every cached sound. Call on user sign-out. */
export async function unloadAllSounds(): Promise<void> {
  if (IS_WEB) {
    for (const el of webAudioByKey.values()) {
      try {
        el.pause();
        el.src = '';
      } catch {
        // ignore
      }
    }
    webAudioByKey.clear();
    return;
  }
  const entries = Array.from(cache.values());
  cache.clear();
  await Promise.all(
    entries.map(async (e) => {
      try {
        await e.sound.unloadAsync();
      } catch {
        // ignore
      }
    }),
  );
}
