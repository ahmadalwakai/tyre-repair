import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const ADMIN_ALERT_CHANNEL_ID = 'admin-alerts';
export const ADMIN_ALERT_SOUND = 'admin_alert.mp3';

let configured = false;

/**
 * Create the high-importance Android notification channel used for all admin
 * alerts. Safe to call multiple times. No-op on iOS (we do not ship iOS).
 *
 * NOTE: Custom sound must be bundled in the native build via the
 * `expo-notifications` plugin in app.json. Changing the bundled sound requires
 * a new EAS Build — EAS Update alone cannot replace native raw resources.
 */
export async function configureAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (configured) return;
  try {
    await Notifications.setNotificationChannelAsync(ADMIN_ALERT_CHANNEL_ID, {
      name: 'Admin Alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: ADMIN_ALERT_SOUND,
      vibrationPattern: [0, 400, 250, 400],
      lightColor: '#E30613',
      enableLights: true,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      showBadge: true,
    });
    configured = true;
  } catch {
    // Notifications module may not be linked in dev client without rebuild — non-fatal.
  }
}
