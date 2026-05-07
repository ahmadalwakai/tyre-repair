import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import type {
  AdminNotificationCategory,
  AdminNotificationPayload,
  ForegroundNotificationInput,
  InAppNotification,
  NotificationResponseInput,
  NotificationScreenTarget,
  NotificationSubscriptionCleanup,
} from './types';

const STICKY_CATEGORIES: ReadonlySet<AdminNotificationCategory> = new Set([
  'booking.created',
  'payment.succeeded',
  'payment.failed',
  'payment.refunded',
  'stock.low',
  'emergency_assist.created',
]);

const ROUTE_BY_TARGET: Record<NotificationScreenTarget, string> = {
  bookings: '/bookings',
  stock: '/stock',
  pricing: '/pricing',
  visitors: '/visitors',
  dashboard: '/dashboard',
  actionQueue: '/(tabs)/action-queue',
};

/**
 * Configure the global notification handler so that foreground notifications
 * still display banner + sound on Android.
 */
export function configureNotificationHandler(): void {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function isAdminCategory(value: unknown): value is AdminNotificationCategory {
  return (
    value === 'booking.created' ||
    value === 'booking.status.updated' ||
    value === 'payment.succeeded' ||
    value === 'payment.failed' ||
    value === 'payment.refunded' ||
    value === 'stock.low' ||
    value === 'stock.updated' ||
    value === 'pricing.rules.updated' ||
    value === 'pricing.override.updated' ||
    value === 'visitor.updated'
  );
}

function isScreenTarget(value: unknown): value is NotificationScreenTarget {
  return (
    value === 'bookings' ||
    value === 'stock' ||
    value === 'pricing' ||
    value === 'visitors' ||
    value === 'dashboard'
  );
}

function readPayload(data: unknown): AdminNotificationPayload | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (!isAdminCategory(d['eventType'])) return null;
  if (!isScreenTarget(d['screenTarget'])) return null;
  const createdAt = typeof d['createdAt'] === 'string' ? d['createdAt'] : new Date().toISOString();
  const result: AdminNotificationPayload = {
    eventType: d['eventType'],
    screenTarget: d['screenTarget'],
    createdAt,
  };
  for (const key of ['bookingId', 'trackingId', 'stockId', 'tyreId', 'overrideId'] as const) {
    const v = d[key];
    if (typeof v === 'string' && v.length > 0) result[key] = v;
  }
  return result;
}

export function subscribeToForegroundNotifications(
  input: ForegroundNotificationInput,
): NotificationSubscriptionCleanup {
  if (Platform.OS === 'web') {
    return { remove: (): void => {} };
  }
  const sub = Notifications.addNotificationReceivedListener((notification) => {
    const content = notification.request.content;
    const payload = readPayload(content.data);
    const id = notification.request.identifier ?? `${Date.now()}`;
    const category: AdminNotificationCategory =
      payload?.eventType ?? 'booking.created';
    const screenTarget: NotificationScreenTarget =
      payload?.screenTarget ?? 'bookings';
    const banner: InAppNotification = {
      id,
      title: content.title ?? 'Admin alert',
      body: content.body ?? '',
      category,
      screenTarget,
      createdAt: payload?.createdAt ?? new Date().toISOString(),
      sticky: STICKY_CATEGORIES.has(category),
    };
    if (payload) banner.payload = payload;
    try {
      input.onReceive(banner);
    } catch {
      // ignore handler errors
    }
  });
  return { remove: (): void => sub.remove() };
}

export function subscribeToNotificationResponses(
  input: NotificationResponseInput,
): NotificationSubscriptionCleanup {
  if (Platform.OS === 'web') {
    return { remove: (): void => {} };
  }
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    const payload = readPayload(data);
    try {
      input.onTap(payload);
    } catch {
      // ignore
    }
    if (payload) {
      try {
        const route = ROUTE_BY_TARGET[payload.screenTarget];
        // Defer routing until layout is mounted to avoid race on cold-start tap.
        setTimeout(() => {
          try {
            router.push(route as Parameters<typeof router.push>[0]);
          } catch {
            // route not ready
          }
        }, 50);
      } catch {
        // ignore
      }
    }
  });
  return { remove: (): void => sub.remove() };
}

export function inAppBannerFromCategory(
  category: AdminNotificationCategory,
  title: string,
  body: string,
  payload?: AdminNotificationPayload,
): InAppNotification {
  const banner: InAppNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    body,
    category,
    screenTarget: payload?.screenTarget ?? 'bookings',
    createdAt: new Date().toISOString(),
    sticky: STICKY_CATEGORIES.has(category),
  };
  if (payload) banner.payload = payload;
  return banner;
}
