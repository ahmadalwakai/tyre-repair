import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';

export interface PlayAdminAlertSoundInput {
  enabled: boolean;
}

let cachedSound: Audio.Sound | null = null;
let unloadingPromise: Promise<void> | null = null;
let audioModeConfigured = false;

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
  } catch (e) {
    console.warn('[admin-alert] setAudioModeAsync failed', e);
  }
}

async function ensureSound(): Promise<Audio.Sound | null> {
  if (cachedSound) return cachedSound;
  await configureAudioModeOnce();
  try {
    // Dynamic require keeps Metro happy when the asset is missing in dev.
    // The actual asset must be bundled via expo-notifications plugin for the
    // system notification sound to work in killed/background state.

    const asset = require('../../../assets/sounds/admin_alert.mp3');
    const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: false });
    cachedSound = sound;
    return sound;
  } catch (e) {
    console.warn('[admin-alert] failed to load admin_alert.mp3', e);
    return null;
  }
}

/**
 * Optional foreground "extra" sound that plays when an in-app banner appears.
 *
 * The system notification sound (killed/background app) is controlled entirely
 * by the Android notification channel registered at startup. Toggling
 * `soundEnabled` only affects this in-app extra sound and any future push
 * payloads — it does not retroactively change a channel's bundled sound.
 */
export async function playAdminAlertSoundIfAllowed(
  input: PlayAdminAlertSoundInput,
): Promise<void> {
  if (!input.enabled) return;
  if (Platform.OS !== 'android' && Platform.OS !== 'ios' && Platform.OS !== 'web') return;
  const sound = await ensureSound();
  if (!sound) return;
  try {
    await sound.setIsLoopingAsync(false);
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (e) {
    console.warn('[admin-alert] playAsync failed', e);
  }
}

/**
 * Looping variant for incoming customer-call popups. Plays continuously until
 * `stopAdminAlertLoop()` is called (popup dismissed, quick booking opened, or
 * the screen is closed). Safe to call multiple times — the same cached
 * `Audio.Sound` instance is reused.
 */
export async function startAdminAlertLoopIfAllowed(
  input: PlayAdminAlertSoundInput,
): Promise<void> {
  if (!input.enabled) return;
  if (Platform.OS !== 'android' && Platform.OS !== 'ios' && Platform.OS !== 'web') return;
  const sound = await ensureSound();
  if (!sound) return;
  try {
    await sound.setIsLoopingAsync(true);
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (e) {
    console.warn('[admin-alert] loop playAsync failed', e);
  }
}

export async function stopAdminAlertLoop(): Promise<void> {
  if (!cachedSound) return;
  try {
    await cachedSound.stopAsync();
    await cachedSound.setIsLoopingAsync(false);
  } catch {
    // ignore
  }
}

export async function unloadAdminAlertSound(): Promise<void> {
  if (!cachedSound) return;
  if (unloadingPromise) return unloadingPromise;
  const target = cachedSound;
  cachedSound = null;
  unloadingPromise = (async (): Promise<void> => {
    try {
      await target.unloadAsync();
    } catch {
      // ignore
    } finally {
      unloadingPromise = null;
    }
  })();
  return unloadingPromise;
}
