import type { RealtimeEvent } from '@tyrerepair/realtime';

export type AdminNotificationCategory =
  | 'booking.created'
  | 'booking.status.updated'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'stock.low'
  | 'stock.updated'
  | 'pricing.rules.updated'
  | 'pricing.override.updated'
  | 'visitor.updated'
  | 'emergency_assist.created';

export type NotificationScreenTarget =
  | 'bookings'
  | 'stock'
  | 'pricing'
  | 'visitors'
  | 'dashboard'
  | 'actionQueue';

export interface AdminNotificationPreferenceState {
  pushEnabled: boolean;
  soundEnabled: boolean;
  bookingAlertsEnabled: boolean;
  stockAlertsEnabled: boolean;
  pricingAlertsEnabled: boolean;
  visitorAlertsEnabled: boolean;
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface NotificationPermissionStatusResult {
  status: PermissionStatus;
  canAskAgain: boolean;
  androidImportance: number | null;
}

export type PushRegistrationStatus =
  | { state: 'idle' }
  | { state: 'unsupported'; reason: 'not_physical_device' | 'no_project_id' | 'permission_denied' }
  | { state: 'registering' }
  | { state: 'registered'; expoPushToken: string }
  | { state: 'error'; message: string };

export interface AdminNotificationPayload {
  eventType: AdminNotificationCategory;
  screenTarget: NotificationScreenTarget;
  createdAt: string;
  bookingId?: string;
  trackingId?: string;
  stockId?: string;
  tyreId?: string;
  overrideId?: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  category: AdminNotificationCategory;
  screenTarget: NotificationScreenTarget;
  createdAt: string;
  payload?: AdminNotificationPayload;
  /**
   * If true, the banner does not auto-dismiss; admin must dismiss manually.
   * Critical events such as bookings/payments/low-stock should be sticky.
   */
  sticky?: boolean;
}

export interface NotificationAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

/** Map a backend-side realtime event to an in-app notification descriptor. */
export type RealtimeEventForBanner = RealtimeEvent;

export interface RegisterAdminPushInput {
  /** Optional override for the device label sent to the backend. */
  deviceName?: string;
}

export interface RegisterAdminPushResult {
  registered: boolean;
  reason?: 'physical_device_required' | 'no_project_id' | 'permission_denied' | 'network_error';
  expoPushToken?: string;
  tokenId?: string;
}

export interface ForegroundNotificationInput {
  onReceive: (notification: InAppNotification) => void;
}

export interface NotificationResponseInput {
  onTap: (payload: AdminNotificationPayload | null) => void;
}

export interface NotificationSubscriptionCleanup {
  remove: () => void;
}
