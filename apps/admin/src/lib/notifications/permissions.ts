import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { NotificationPermissionStatusResult, PermissionStatus } from './types';

function mapStatus(s: Notifications.PermissionStatus): PermissionStatus {
  if (s === Notifications.PermissionStatus.GRANTED) return 'granted';
  if (s === Notifications.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

function buildResult(p: Notifications.NotificationPermissionsStatus): NotificationPermissionStatusResult {
  const androidImportance =
    Platform.OS === 'android' && p.android?.importance !== undefined
      ? Number(p.android.importance)
      : null;
  return {
    status: mapStatus(p.status),
    canAskAgain: p.canAskAgain ?? false,
    androidImportance,
  };
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatusResult> {
  try {
    const current = await Notifications.getPermissionsAsync();
    return buildResult(current);
  } catch {
    return { status: 'undetermined', canAskAgain: true, androidImportance: null };
  }
}

export async function requestNotificationPermissions(): Promise<NotificationPermissionStatusResult> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === Notifications.PermissionStatus.GRANTED) {
      return buildResult(current);
    }
    if (!current.canAskAgain) {
      return buildResult(current);
    }
    const next = await Notifications.requestPermissionsAsync({
      android: {},
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return buildResult(next);
  } catch {
    return { status: 'undetermined', canAskAgain: true, androidImportance: null };
  }
}
