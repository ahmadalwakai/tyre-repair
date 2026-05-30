import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'admin.hasSeenPermissionsOnboarding.v1';

export async function hasSeenPermissionsOnboarding(): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(KEY) === '1';
    } catch {
      return true;
    }
  }
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function markPermissionsOnboardingSeen(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(KEY, '1');
  } catch {
    /* ignore */
  }
}

export async function resetPermissionsOnboarding(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* ignore */
  }
}
