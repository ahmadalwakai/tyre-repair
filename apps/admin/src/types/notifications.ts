export type NotificationPriority = 'normal' | 'high';

export interface AdminNotification {
  id: string;
  type: string;
  priority: NotificationPriority | string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  bookingId: string | null;
  trackingId: string | null;
  callbackRequestId: string | null;
  stockId: string | null;
  actionTarget: string | null;
  readAt: string | null;
  handledAt: string | null;
  createdAt: string;
}

export interface NotificationInboxResponse {
  notifications: AdminNotification[];
  counts: {
    total: number;
    unread: number;
    highPriorityUnread: number;
    pendingHandled: number;
  };
}

export type InboxFilterType = 'booking' | 'payment' | 'stock' | 'callback' | 'system';
