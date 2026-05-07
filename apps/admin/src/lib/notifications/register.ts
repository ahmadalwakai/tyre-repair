import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { configureAndroidNotificationChannels } from './channels';
import { requestNotificationPermissions } from './permissions';
import { registerAdminPushTokenOnServer } from './preferences';
import type { RegisterAdminPushInput, RegisterAdminPushResult } from './types';

function readProjectId(): string | null {
  // Prefer Expo Constants (set by EAS / app.json `extra.eas.projectId`).
  const fromConstants =
    Constants?.expoConfig?.extra?.['eas']?.['projectId'] ??
    Constants?.easConfig?.['projectId'] ??
    null;
  if (typeof fromConstants === 'string' && fromConstants.length > 0) {
    return fromConstants;
  }
  const fromEnv = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;
  return null;
}

/**
 * Run after admin login. Requests permissions, ensures the Android channel,
 * obtains the Expo push token, and uploads it to the backend.
 *
 * Never throws — always returns a typed status so the caller can render UI.
 */
export async function registerForAdminPushNotifications(
  input: RegisterAdminPushInput = {},
): Promise<RegisterAdminPushResult> {
  if (Platform.OS !== 'android') {
    return { registered: false, reason: 'physical_device_required' };
  }
  if (!Device.isDevice) {
    return { registered: false, reason: 'physical_device_required' };
  }

  await configureAndroidNotificationChannels();

  const perm = await requestNotificationPermissions();
  if (perm.status !== 'granted') {
    return { registered: false, reason: 'permission_denied' };
  }

  const projectId = readProjectId();
  if (!projectId) {
    return { registered: false, reason: 'no_project_id' };
  }

  let expoPushToken: string;
  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    expoPushToken = tokenResult.data;
  } catch {
    return { registered: false, reason: 'network_error' };
  }
  if (!expoPushToken) {
    return { registered: false, reason: 'network_error' };
  }

  try {
    const deviceName = input.deviceName ?? Device.deviceName ?? Device.modelName ?? undefined;
    const payload: { expoPushToken: string; deviceName?: string; appVersion?: string; nativeBuildVersion?: string } = {
      expoPushToken,
    };
    if (deviceName) payload.deviceName = deviceName;
    const appVersion = Constants?.expoConfig?.version ?? undefined;
    if (appVersion) payload.appVersion = appVersion;
    const nativeBuildVersion =
      Constants?.expoConfig?.android?.versionCode != null
        ? String(Constants.expoConfig.android.versionCode)
        : undefined;
    if (nativeBuildVersion) payload.nativeBuildVersion = nativeBuildVersion;

    const result = await registerAdminPushTokenOnServer(payload);
    return { registered: true, expoPushToken, tokenId: result.tokenId };
  } catch {
    return { registered: false, reason: 'network_error', expoPushToken };
  }
}
