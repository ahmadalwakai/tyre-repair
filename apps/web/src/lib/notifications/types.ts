import type { BookingStatus, RealtimeEvent } from '@tyrerepair/realtime';

/**
 * Categories of admin push notifications. Each category maps to one or more
 * realtime event types and one or more notification preference toggles.
 */
export type AdminPushNotificationCategory =
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
  | 'callback.requested'
  | 'booking.adjustment.created'
  | 'booking.adjustment.paid'
  | 'lead.call.clicked'
  | 'payment.deposit.succeeded'
  | 'payment.balance.succeeded'
  | 'emergency_assist.created'
  | 'booking.checkout.started';

export type NotificationScreenTarget =
  | 'bookings'
  | 'stock'
  | 'pricing'
  | 'visitors'
  | 'dashboard'
  | 'callbacks'
  | 'quickBooking';

/**
 * Privacy-safe data payload attached to every push notification. Never include
 * full customer addresses, raw Stripe IDs, or admin notes.
 */
export interface AdminPushDataPayload {
  eventType: AdminPushNotificationCategory;
  screenTarget: NotificationScreenTarget;
  createdAt: string;
  bookingId?: string;
  trackingId?: string;
  stockId?: string;
  tyreId?: string;
  overrideId?: string;
  callbackRequestId?: string;
  adjustmentId?: string;
  callClickEventId?: string;
  emergencyAssistEventId?: string;
  phone?: string;
  customerName?: string;
  tyreProblemType?: string;
  jobType?: string;
  sourcePage?: string;
  vehicleRegistration?: string;
  locationLabel?: string;
}

export interface AdminPushNotificationTemplate {
  category: AdminPushNotificationCategory;
  title: string;
  body: string;
  screenTarget: NotificationScreenTarget;
  data: AdminPushDataPayload;
  priority: 'high';
}

export interface SendExpoPushMessagesInput {
  tokens: string[];
  title: string;
  body: string;
  data: AdminPushDataPayload;
  channelId: 'admin-alerts';
  sound: string | null;
  priority: 'high';
}

export interface SendExpoPushMessagesResult {
  attempted: number;
  sent: number;
  failed: number;
  invalidTokens: string[];
}

export interface SendAdminNotificationForRealtimeEventInput {
  event: RealtimeEvent;
  /** Optional override for which admin to notify (default: all active). */
  onlyAdminId?: string;
}

export interface SendAdminNotificationResult {
  category: AdminPushNotificationCategory | null;
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
  invalidTokens: string[];
}

export interface RegisterPushTokenInput {
  adminId: string;
  expoPushToken: string;
  platform: 'android';
  deviceName?: string | null;
}

export interface UpdateAdminNotificationPreferencesInput {
  pushEnabled?: boolean;
  soundEnabled?: boolean;
  bookingAlertsEnabled?: boolean;
  stockAlertsEnabled?: boolean;
  pricingAlertsEnabled?: boolean;
  visitorAlertsEnabled?: boolean;
}

export interface AdminNotificationPreferences {
  pushEnabled: boolean;
  soundEnabled: boolean;
  bookingAlertsEnabled: boolean;
  stockAlertsEnabled: boolean;
  pricingAlertsEnabled: boolean;
  visitorAlertsEnabled: boolean;
}

export interface ActiveAdminPushToken {
  id: string;
  adminId: string;
  expoPushToken: string;
}

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: 'pending payment',
  confirmed: 'confirmed',
  dispatching: 'dispatching',
  dispatched: 'dispatched',
  on_site: 'on-site',
  completed: 'completed',
  cancelled: 'cancelled',
  refunded: 'refunded',
  failed: 'failed',
};
