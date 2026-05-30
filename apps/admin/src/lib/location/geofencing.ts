import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

export const GEOFENCE_TASK = 'admin-booking-geofence';

interface BookingRegion {
  identifier: string;
  latitude: number;
  longitude: number;
  /** Radius in meters. */
  radius?: number;
  notifyOnEnter?: boolean;
  notifyOnExit?: boolean;
}

if (!TaskManager.isTaskDefined(GEOFENCE_TASK)) {
  TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
    if (error) return;
    const payload = data as
      | { eventType: Location.GeofencingEventType; region: Location.LocationRegion }
      | undefined;
    if (!payload?.region) return;
    const title =
      payload.eventType === Location.GeofencingEventType.Enter
        ? 'Arrived at customer'
        : 'Left customer location';
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: `Booking ${payload.region.identifier}`,
          sound: true,
          data: { bookingId: payload.region.identifier, type: 'geofence' },
        },
        trigger: null,
      });
    } catch {
      // best-effort
    }
  });
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted';
}

export async function startBookingGeofences(regions: BookingRegion[]): Promise<void> {
  if (regions.length === 0) {
    await stopBookingGeofences();
    return;
  }
  const granted = await requestBackgroundLocationPermission();
  if (!granted) throw new Error('Background location permission denied');
  const mapped: Location.LocationRegion[] = regions.map((r) => ({
    identifier: r.identifier,
    latitude: r.latitude,
    longitude: r.longitude,
    radius: r.radius ?? 150,
    notifyOnEnter: r.notifyOnEnter ?? true,
    notifyOnExit: r.notifyOnExit ?? false,
  }));
  await Location.startGeofencingAsync(GEOFENCE_TASK, mapped);
}

export async function stopBookingGeofences(): Promise<void> {
  const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false);
  if (started) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => undefined);
  }
}

export async function isGeofencingActive(): Promise<boolean> {
  return Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false);
}
