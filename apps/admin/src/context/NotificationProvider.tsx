import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { Channel } from 'pusher-js';
import { useSession } from '@/components/auth/SessionProvider';
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
} from '@/lib/notifications/permissions';
import { configureAndroidNotificationChannels } from '@/lib/notifications/channels';
import {
  configureNotificationHandler,
  inAppBannerFromCategory,
  subscribeToForegroundNotifications,
  subscribeToNotificationResponses,
} from '@/lib/notifications/listeners';
import { registerForAdminPushNotifications } from '@/lib/notifications/register';
import {
  getAdminNotificationPreferences,
  patchAdminNotificationPreferences,
  sendAdminTestNotification,
  unregisterAdminPushTokenOnServer,
} from '@/lib/notifications/preferences';
import {
  playAdminAlertSoundIfAllowed,
  startAdminAlertLoopIfAllowed,
  stopAdminAlertLoop,
} from '@/lib/notifications/sound';
import { subscribePrivate } from '@/lib/realtime/client';
import { getRecentUnhandledCallClicks } from '@/lib/api/call-click-events';
import type {
  AdminNotificationCategory,
  AdminNotificationPreferenceState,
  InAppNotification,
  NotificationPermissionStatusResult,
  PushRegistrationStatus,
} from '@/lib/notifications/types';

const DEFAULT_PREFS: AdminNotificationPreferenceState = {
  pushEnabled: true,
  soundEnabled: true,
  bookingAlertsEnabled: true,
  stockAlertsEnabled: true,
  pricingAlertsEnabled: true,
  visitorAlertsEnabled: false,
};

interface BannerTemplate {
  title: string;
  body: string;
  category: AdminNotificationCategory;
  screenTarget: 'bookings' | 'stock' | 'pricing' | 'visitors' | 'dashboard' | 'actionQueue';
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  pending_payment: 'Pending payment',
  awaiting_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function formatGbp(pennies: number | undefined): string {
  if (typeof pennies !== 'number' || Number.isNaN(pennies)) return '£0.00';
  return `£${(pennies / 100).toFixed(2)}`;
}

function templateForRealtime(event: { type: string; payload: Record<string, unknown> }): BannerTemplate | null {
  const p = event.payload ?? {};
  switch (event.type) {
    case 'booking.created': {
      const customer = String(p['customerName'] ?? 'Customer');
      const total = formatGbp(typeof p['totalPriceGbp'] === 'number' ? Number(p['totalPriceGbp']) * 100 : undefined);
      return {
        title: 'New booking confirmed',
        body: `${customer} • ${total}`,
        category: 'booking.created',
        screenTarget: 'bookings',
      };
    }
    case 'booking.checkout.started': {
      const total = formatGbp(
        p['totalPriceGbp'] ? Number(p['totalPriceGbp']) * 100 : undefined,
      );
      const mode = String(p['paymentMode'] ?? 'FULL') === 'DEPOSIT' ? 'deposit' : 'full payment';
      const qAt = p['quoteCreatedAt'] ? String(p['quoteCreatedAt']) : null;
      let age = '';
      if (qAt) {
        const ms = Math.max(0, Date.now() - new Date(qAt).getTime());
        const min = Math.floor(ms / 60000);
        if (min < 60) age = ` • quote ${min}m old`;
        else age = ` • quote ${Math.floor(min / 60)}h old`;
      }
      return {
        title: 'Customer at checkout',
        body: `Someone is paying right now • ${total} • ${mode}${age}`,
        category: 'booking.created',
        screenTarget: 'bookings',
      };
    }
    case 'booking.status.updated': {
      const next = String(p['status'] ?? '');
      return {
        title: 'Booking status updated',
        body: `Now ${STATUS_LABELS[next] ?? next}`,
        category: 'booking.status.updated',
        screenTarget: 'bookings',
      };
    }
    case 'payment.succeeded':
      return {
        title: 'Payment received',
        body: `${formatGbp(Number(p['amountPence'] ?? 0))} captured.`,
        category: 'payment.succeeded',
        screenTarget: 'bookings',
      };
    case 'payment.failed':
      return {
        title: 'Payment failed',
        body: `${formatGbp(Number(p['amountPence'] ?? 0))} declined.`,
        category: 'payment.failed',
        screenTarget: 'bookings',
      };
    case 'payment.refunded':
      return {
        title: 'Payment refunded',
        body: `${formatGbp(Number(p['amountPence'] ?? 0))} refunded.`,
        category: 'payment.refunded',
        screenTarget: 'bookings',
      };
    case 'stock.low':
      return {
        title: 'Low stock',
        body: `${String(p['sku'] ?? 'SKU')} • ${Number(p['quantityAvailable'] ?? 0)} left`,
        category: 'stock.low',
        screenTarget: 'stock',
      };
    case 'stock.updated':
      return {
        title: 'Stock updated',
        body: `${String(p['sku'] ?? 'SKU')} • now ${Number(p['quantityAvailable'] ?? 0)}`,
        category: 'stock.updated',
        screenTarget: 'stock',
      };
    case 'pricing.rules.updated':
      return {
        title: 'Pricing rules updated',
        body: 'Live pricing rules have changed.',
        category: 'pricing.rules.updated',
        screenTarget: 'pricing',
      };
    case 'pricing.override.updated':
      return {
        title: 'Pricing override updated',
        body: 'A size-level override changed.',
        category: 'pricing.override.updated',
        screenTarget: 'pricing',
      };
    case 'emergency_assist.created': {
      const phone = p['customerPhone'] ? String(p['customerPhone']) : null;
      return {
        title: 'Emergency assist started',
        body: phone
          ? `A customer clicked I need help now. Phone: ${phone}.`
          : 'A customer clicked I need help now on the quote page.',
        category: 'emergency_assist.created',
        screenTarget: 'actionQueue',
      };
    }
    case 'emergency_assist.location_updated': {
      const label = p['locationLabel'] ? String(p['locationLabel']) : null;
      const conf = String(p['locationConfidence'] ?? '');
      const summary =
        conf === 'CONFIRMED_ADDRESS'
          ? 'Address confirmed'
          : conf === 'GPS_ONLY'
            ? 'GPS-only location'
            : conf === 'WEAK_ADDRESS'
              ? 'Partial address'
              : 'Location received';
      return {
        title: 'Emergency assist — location received',
        body: label ? `${summary}: ${label}` : summary,
        category: 'emergency_assist.created',
        screenTarget: 'actionQueue',
      };
    }
    default:
      return null;
  }
}

const PREF_FOR_CATEGORY: Record<AdminNotificationCategory, keyof AdminNotificationPreferenceState> = {
  'booking.created': 'bookingAlertsEnabled',
  'booking.status.updated': 'bookingAlertsEnabled',
  'payment.succeeded': 'bookingAlertsEnabled',
  'payment.failed': 'bookingAlertsEnabled',
  'payment.refunded': 'bookingAlertsEnabled',
  'stock.low': 'stockAlertsEnabled',
  'stock.updated': 'stockAlertsEnabled',
  'pricing.rules.updated': 'pricingAlertsEnabled',
  'pricing.override.updated': 'pricingAlertsEnabled',
  'visitor.updated': 'visitorAlertsEnabled',
  'emergency_assist.created': 'bookingAlertsEnabled',
};

interface NotificationContextValue {
  permission: NotificationPermissionStatusResult | null;
  registration: PushRegistrationStatus;
  preferences: AdminNotificationPreferenceState;
  loadingPreferences: boolean;
  preferencesError: string | null;
  banner: InAppNotification | null;
  incomingCall: IncomingCallInfo | null;
  emergencyAssist: EmergencyAssistInfo | null;
  newBooking: NewBookingInfo | null;
  refreshPermission: () => Promise<void>;
  requestPermission: () => Promise<NotificationPermissionStatusResult>;
  registerDevice: () => Promise<PushRegistrationStatus>;
  refreshPreferences: () => Promise<void>;
  updatePreference: <K extends keyof AdminNotificationPreferenceState>(
    key: K,
    value: AdminNotificationPreferenceState[K],
  ) => Promise<void>;
  sendTest: (kind: 'booking' | 'stock' | 'pricing') => Promise<{ ok: boolean; sent: number; message?: string }>;
  showBanner: (banner: InAppNotification) => void;
  dismissBanner: () => void;
  dismissIncomingCall: () => void;
  dismissEmergencyAssist: () => void;
  dismissNewBooking: () => void;
  unregisterCurrentDevice: () => Promise<void>;
}

export interface IncomingCallInfo {
  callClickEventId: string;
  phone: string | null;
  customerName: string | null;
  tyreProblemType: string | null;
  jobType: 'ASSESSMENT' | 'REPLACEMENT' | null;
  sourcePage: string | null;
  sourceComponent: string | null;
  receivedAt: string;
}

export type EmergencyLocationConfidence =
  | 'CONFIRMED_ADDRESS'
  | 'GPS_ONLY'
  | 'WEAK_ADDRESS'
  | 'MISSING_LOCATION';

export interface EmergencyAssistInfo {
  eventId: string;
  phone: string | null;
  customerName: string | null;
  tyreProblemType: string | null;
  jobType: 'ASSESSMENT' | 'REPLACEMENT' | null;
  vehicleRegistration: string | null;
  sourcePage: string | null;
  sourceComponent: string | null;
  receivedAt: string;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  locationConfidence: EmergencyLocationConfidence | null;
  locationUpdatedAt: string | null;
}

export interface NewBookingInfo {
  bookingId: string;
  trackingId: string;
  customerName: string;
  phone: string | null;
  customerEmail: string | null;
  vehicleRegistration: string | null;
  tyreProblemType: string | null;
  jobType: 'ASSESSMENT' | 'REPLACEMENT' | null;
  lockingWheelNutStatus: 'HAVE_KEY' | 'NO_KEY' | 'STANDARD_ONLY' | null;
  totalPriceGbp: string;
  paymentMode: 'FULL' | 'DEPOSIT';
  locationLabel: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  receivedAt: string;
  quoteCreatedAt: string | null;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { admin } = useSession();
  const [permission, setPermission] = useState<NotificationPermissionStatusResult | null>(null);
  const [registration, setRegistration] = useState<PushRegistrationStatus>({ state: 'idle' });
  const [preferences, setPreferences] = useState<AdminNotificationPreferenceState>(DEFAULT_PREFS);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [banner, setBanner] = useState<InAppNotification | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [emergencyAssist, setEmergencyAssist] = useState<EmergencyAssistInfo | null>(null);
  const [queuedEmergencyAssist, setQueuedEmergencyAssist] = useState<EmergencyAssistInfo | null>(null);
  const [newBooking, setNewBooking] = useState<NewBookingInfo | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const adminChannelRef = useRef<Channel | null>(null);
  const preferencesRef = useRef<AdminNotificationPreferenceState>(preferences);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  const dismissBanner = useCallback((): void => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    setBanner(null);
  }, []);

  const dismissIncomingCall = useCallback((): void => {
    setIncomingCall(null);
  }, []);

  const dismissEmergencyAssist = useCallback((): void => {
    setEmergencyAssist(null);
  }, []);

  const dismissNewBooking = useCallback((): void => {
    setNewBooking(null);
  }, []);

  const showBanner = useCallback(
    (next: InAppNotification): void => {
      if (seenIds.current.has(next.id)) return;
      seenIds.current.add(next.id);
      // bound dedup cache
      if (seenIds.current.size > 200) {
        const first = seenIds.current.values().next().value;
        if (first) seenIds.current.delete(first);
      }
      const prefs = preferencesRef.current;
      if (!prefs.pushEnabled) return;
      const prefKey = PREF_FOR_CATEGORY[next.category];
      if (!prefs[prefKey]) return;

      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
      setBanner(next);
      void playAdminAlertSoundIfAllowed({ enabled: prefs.soundEnabled });
      if (!next.sticky) {
        dismissTimer.current = setTimeout(() => {
          setBanner(null);
          dismissTimer.current = null;
        }, 8000);
      }
    },
    [],
  );

  // Configure handler + channel once at mount.
  useEffect(() => {
    configureNotificationHandler();
    void configureAndroidNotificationChannels();
  }, []);

  // Foreground push receiver + tap response.
  useEffect(() => {
    const recv = subscribeToForegroundNotifications({
      onReceive: (n) => showBanner(n),
    });
    const tap = subscribeToNotificationResponses({
      onTap: () => {
        // routing is handled inside listener
      },
    });
    return () => {
      recv.remove();
      tap.remove();
    };
  }, [showBanner]);

  const refreshPermission = useCallback(async (): Promise<void> => {
    const next = await getNotificationPermissionStatus();
    setPermission(next);
  }, []);

  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  const requestPermission = useCallback(async (): Promise<NotificationPermissionStatusResult> => {
    const next = await requestNotificationPermissions();
    setPermission(next);
    return next;
  }, []);

  const registerDevice = useCallback(async (): Promise<PushRegistrationStatus> => {
    setRegistration({ state: 'registering' });
    const result = await registerForAdminPushNotifications();
    let next: PushRegistrationStatus;
    if (result.registered && result.expoPushToken) {
      next = { state: 'registered', expoPushToken: result.expoPushToken };
    } else if (result.reason === 'physical_device_required') {
      next = { state: 'unsupported', reason: 'not_physical_device' };
    } else if (result.reason === 'no_project_id') {
      next = { state: 'unsupported', reason: 'no_project_id' };
    } else if (result.reason === 'permission_denied') {
      next = { state: 'unsupported', reason: 'permission_denied' };
    } else {
      next = { state: 'error', message: result.reason ?? 'register_failed' };
    }
    setRegistration(next);
    return next;
  }, []);

  const refreshPreferences = useCallback(async (): Promise<void> => {
    if (!admin) return;
    setLoadingPreferences(true);
    setPreferencesError(null);
    try {
      const res = await getAdminNotificationPreferences();
      setPreferences(res.preferences);
    } catch (e) {
      setPreferencesError(e instanceof Error ? e.message : 'Could not load preferences');
    } finally {
      setLoadingPreferences(false);
    }
  }, [admin]);

  const updatePreference = useCallback(
    async <K extends keyof AdminNotificationPreferenceState>(
      key: K,
      value: AdminNotificationPreferenceState[K],
    ): Promise<void> => {
      const prev = preferencesRef.current;
      const optimistic = { ...prev, [key]: value };
      setPreferences(optimistic);
      try {
        const res = await patchAdminNotificationPreferences({ [key]: value });
        setPreferences(res.preferences);
      } catch (e) {
        setPreferences(prev);
        setPreferencesError(e instanceof Error ? e.message : 'Could not save preferences');
      }
    },
    [],
  );

  const sendTest = useCallback(
    async (kind: 'booking' | 'stock' | 'pricing'): Promise<{ ok: boolean; sent: number; message?: string }> => {
      try {
        const res = await sendAdminTestNotification(kind);
        if (res.sent > 0) return { ok: true, sent: res.sent };
        if (!preferencesRef.current.pushEnabled) {
          return { ok: false, sent: 0, message: 'Push notifications are disabled in your preferences.' };
        }
        return {
          ok: false,
          sent: 0,
          message: 'No active devices found. Register this device first.',
        };
      } catch (e) {
        return { ok: false, sent: 0, message: e instanceof Error ? e.message : 'Test failed' };
      }
    },
    [],
  );

  const unregisterCurrentDevice = useCallback(async (): Promise<void> => {
    if (registration.state !== 'registered') return;
    try {
      await unregisterAdminPushTokenOnServer({ expoPushToken: registration.expoPushToken });
    } catch {
      // best effort
    }
    setRegistration({ state: 'idle' });
  }, [registration]);

  // Auto-load preferences when admin logs in/out.
  useEffect(() => {
    if (admin) {
      void refreshPreferences();
    } else {
      setPreferences(DEFAULT_PREFS);
      setRegistration({ state: 'idle' });
      setBanner(null);
      setIncomingCall(null);
      setEmergencyAssist(null);
      setQueuedEmergencyAssist(null);
      setNewBooking(null);
    }
  }, [admin, refreshPreferences]);

  // Subscribe to private-admin pusher channel for in-app banners while app is open.
  useEffect(() => {
    if (!admin) return undefined;
    const ch = subscribePrivate('private-admin');
    if (!ch) return undefined;
    adminChannelRef.current = ch;
    const handler = (event: { type: string; payload: Record<string, unknown>; createdAt?: string }): void => {
      const tpl = templateForRealtime(event);
      if (!tpl) return;
      const banner = inAppBannerFromCategory(tpl.category, tpl.title, tpl.body);
      banner.screenTarget = tpl.screenTarget;
      showBanner(banner);
    };
    const eventNames = [
      'booking.created',
      'booking.checkout.started',
      'booking.status.updated',
      'payment.succeeded',
      'payment.failed',
      'payment.refunded',
      'stock.low',
      'stock.updated',
      'pricing.rules.updated',
      'pricing.override.updated',
      'emergency_assist.created',
      'emergency_assist.location_updated',
    ];
    for (const name of eventNames) {
      ch.bind(name, handler);
    }

    // Special handler: an incoming customer call has been triggered by a
    // tel: tap on the public site. Show a sticky popup so admin can start a
    // quick booking immediately.
    const callHandler = (event: {
      type: string;
      payload: Record<string, unknown>;
      createdAt?: string;
    }): void => {
      const p = event.payload ?? {};
      const info: IncomingCallInfo = {
        callClickEventId: String(p['callClickEventId'] ?? ''),
        phone: p['phone'] ? String(p['phone']) : null,
        customerName: p['customerName'] ? String(p['customerName']) : null,
        tyreProblemType: p['tyreProblemType'] ? String(p['tyreProblemType']) : null,
        jobType: (p['jobType'] as 'ASSESSMENT' | 'REPLACEMENT' | undefined) ?? null,
        sourcePage: p['sourcePage'] ? String(p['sourcePage']) : null,
        sourceComponent: p['sourceComponent'] ? String(p['sourceComponent']) : null,
        receivedAt: event.createdAt ?? new Date().toISOString(),
      };
      setIncomingCall(info);
      void startAdminAlertLoopIfAllowed({
        enabled: preferencesRef.current.soundEnabled,
      });
    };
    ch.bind('lead.call.clicked', callHandler);

    // Emergency assist: build popup info, dedupe by eventId, queue if a
    // call-click popup is currently open so the two never overlap.
    const emergencyHandler = (event: {
      type: string;
      payload: Record<string, unknown>;
      createdAt?: string;
    }): void => {
      const p = event.payload ?? {};
      const eventId = String(p['eventId'] ?? '');
      if (!eventId) return;
      const info: EmergencyAssistInfo = {
        eventId,
        phone: p['customerPhone'] ? String(p['customerPhone']) : null,
        customerName: p['customerName'] ? String(p['customerName']) : null,
        tyreProblemType: p['tyreProblemType'] ? String(p['tyreProblemType']) : null,
        jobType: (p['jobType'] as 'ASSESSMENT' | 'REPLACEMENT' | undefined) ?? null,
        vehicleRegistration: p['vehicleRegistration']
          ? String(p['vehicleRegistration'])
          : null,
        sourcePage: p['sourcePage'] ? String(p['sourcePage']) : null,
        sourceComponent: p['sourceComponent'] ? String(p['sourceComponent']) : null,
        receivedAt: event.createdAt ?? new Date().toISOString(),
        locationLabel: p['locationLabel'] ? String(p['locationLabel']) : null,
        latitude: typeof p['latitude'] === 'number' ? (p['latitude'] as number) : null,
        longitude: typeof p['longitude'] === 'number' ? (p['longitude'] as number) : null,
        locationConfidence:
          (p['locationConfidence'] as EmergencyLocationConfidence | undefined) ?? null,
        locationUpdatedAt: null,
      };
      // Dedupe: if same event already shown or queued, ignore.
      setEmergencyAssist((current) => {
        if (current && current.eventId === eventId) return current;
        if (incomingCallRef.current) {
          // Call popup occupying screen — queue and don't open emergency popup.
          setQueuedEmergencyAssist((q) =>
            q && q.eventId === eventId ? q : info,
          );
          return current;
        }
        return info;
      });
      void playAdminAlertSoundIfAllowed({
        enabled: preferencesRef.current.soundEnabled,
      });
    };
    ch.bind('emergency_assist.created', emergencyHandler);

    // Emergency assist location update: merge into open popup or queued copy,
    // never spawn a second popup.
    const emergencyLocationHandler = (event: {
      type: string;
      payload: Record<string, unknown>;
      createdAt?: string;
    }): void => {
      const p = event.payload ?? {};
      const eventId = String(p['eventId'] ?? '');
      if (!eventId) return;
      const patch = {
        locationLabel: p['locationLabel'] ? String(p['locationLabel']) : null,
        latitude:
          typeof p['latitude'] === 'number' ? (p['latitude'] as number) : null,
        longitude:
          typeof p['longitude'] === 'number' ? (p['longitude'] as number) : null,
        locationConfidence:
          (p['locationConfidence'] as EmergencyLocationConfidence | undefined) ?? null,
        locationUpdatedAt: event.createdAt ?? new Date().toISOString(),
      };
      setEmergencyAssist((current) =>
        current && current.eventId === eventId ? { ...current, ...patch } : current,
      );
      setQueuedEmergencyAssist((q) =>
        q && q.eventId === eventId ? { ...q, ...patch } : q,
      );
    };
    ch.bind('emergency_assist.location_updated', emergencyLocationHandler);

    // New booking confirmed (payment succeeded). Build a rich popup so the
    // admin can immediately see the customer + location and call/WhatsApp.
    const newBookingHandler = (event: {
      type: string;
      payload: Record<string, unknown>;
      createdAt?: string;
    }): void => {
      const p = event.payload ?? {};
      const bookingId = String(p['bookingId'] ?? '');
      if (!bookingId) return;
      const info: NewBookingInfo = {
        bookingId,
        trackingId: String(p['trackingId'] ?? ''),
        customerName: p['customerName'] ? String(p['customerName']) : 'Customer',
        phone: p['phone'] ? String(p['phone']) : null,
        customerEmail: p['customerEmail'] ? String(p['customerEmail']) : null,
        vehicleRegistration: p['vehicleRegistration']
          ? String(p['vehicleRegistration'])
          : null,
        tyreProblemType: p['tyreProblemType'] ? String(p['tyreProblemType']) : null,
        jobType: (p['jobType'] as 'ASSESSMENT' | 'REPLACEMENT' | undefined) ?? null,
        lockingWheelNutStatus:
          (p['lockingWheelNutStatus'] as
            | 'HAVE_KEY'
            | 'NO_KEY'
            | 'STANDARD_ONLY'
            | undefined) ?? null,
        totalPriceGbp: p['totalPriceGbp'] ? String(p['totalPriceGbp']) : '0.00',
        paymentMode:
          (p['paymentMode'] as 'FULL' | 'DEPOSIT' | undefined) ?? 'FULL',
        locationLabel: p['locationLabel'] ? String(p['locationLabel']) : null,
        postcode: p['postcode'] ? String(p['postcode']) : null,
        latitude:
          typeof p['latitude'] === 'number' ? (p['latitude'] as number) : null,
        longitude:
          typeof p['longitude'] === 'number' ? (p['longitude'] as number) : null,
        receivedAt: event.createdAt ?? new Date().toISOString(),
        quoteCreatedAt: p['quoteCreatedAt'] ? String(p['quoteCreatedAt']) : null,
      };
      setNewBooking((current) => (current && current.bookingId === bookingId ? current : info));
      void playAdminAlertSoundIfAllowed({
        enabled: preferencesRef.current.soundEnabled,
      });
    };
    ch.bind('booking.created', newBookingHandler);

    return (): void => {
      for (const name of eventNames) {
        ch.unbind(name, handler);
      }
      ch.unbind('lead.call.clicked', callHandler);
      ch.unbind('emergency_assist.created', emergencyHandler);
      ch.unbind('emergency_assist.location_updated', emergencyLocationHandler);
      ch.unbind('booking.created', newBookingHandler);
      try {
        ch.unsubscribe();
      } catch {
        // ignore
      }
      adminChannelRef.current = null;
    };
  }, [admin, showBanner]);

  // Foreground replay: if a call-click event was missed while the app was
  // backgrounded, fetch the most recent unhandled one on resume and surface
  // it through the same incoming-call popup. Replayed events are tracked per
  // session so the same id never triggers the popup twice after dismiss.
  const replayedCallClickIds = useRef<Set<string>>(new Set());
  const incomingCallRef = useRef<IncomingCallInfo | null>(incomingCall);
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  const replayLatestUnhandledCallClick = useCallback(async (): Promise<void> => {
    try {
      const res = await getRecentUnhandledCallClicks({ minutes: 30, limit: 1 });
      const latest = res.items[0];
      if (!latest) return;
      if (replayedCallClickIds.current.has(latest.id)) return;
      if (incomingCallRef.current?.callClickEventId === latest.id) return;
      if (incomingCallRef.current) return; // popup already showing
      replayedCallClickIds.current.add(latest.id);
      const info: IncomingCallInfo = {
        callClickEventId: latest.id,
        phone: latest.phone ?? null,
        customerName: latest.customerName ?? null,
        tyreProblemType: latest.tyreProblemType ?? null,
        jobType: latest.jobType ?? null,
        sourcePage: latest.sourcePage ?? null,
        sourceComponent: latest.sourceComponent ?? null,
        receivedAt: latest.createdAt,
      };
      setIncomingCall(info);
      void startAdminAlertLoopIfAllowed({
        enabled: preferencesRef.current.soundEnabled,
      });
    } catch {
      // best effort
    }
  }, []);

  // Stop the looping alert as soon as the popup is dismissed/handled.
  useEffect(() => {
    if (!incomingCall) {
      void stopAdminAlertLoop();
    }
  }, [incomingCall]);

  // Flush queued emergency assist popup once the call popup is dismissed and
  // no emergency popup is currently shown.
  useEffect(() => {
    if (incomingCall) return;
    if (emergencyAssist) return;
    if (!queuedEmergencyAssist) return;
    setEmergencyAssist(queuedEmergencyAssist);
    setQueuedEmergencyAssist(null);
    void playAdminAlertSoundIfAllowed({
      enabled: preferencesRef.current.soundEnabled,
    });
  }, [incomingCall, emergencyAssist, queuedEmergencyAssist]);

  useEffect(() => {
    if (!admin) return undefined;
    // Run once on mount/login so a fresh open also catches missed events.
    void replayLatestUnhandledCallClick();
    const sub = AppState.addEventListener('change', (state: AppStateStatus): void => {
      if (state === 'active') {
        void replayLatestUnhandledCallClick();
      }
    });
    return (): void => {
      sub.remove();
    };
  }, [admin, replayLatestUnhandledCallClick]);

  // Auto-register once admin authenticated and permission already granted.
  useEffect(() => {
    if (!admin) return;
    if (registration.state !== 'idle') return;
    if (permission?.status !== 'granted') return;
    void registerDevice();
  }, [admin, permission, registration.state, registerDevice]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      permission,
      registration,
      preferences,
      loadingPreferences,
      preferencesError,
      banner,
      incomingCall,
      emergencyAssist,
      newBooking,
      refreshPermission,
      requestPermission,
      registerDevice,
      refreshPreferences,
      updatePreference,
      sendTest,
      showBanner,
      dismissBanner,
      dismissIncomingCall,
      dismissEmergencyAssist,
      dismissNewBooking,
      unregisterCurrentDevice,
    }),
    [
      permission,
      registration,
      preferences,
      loadingPreferences,
      preferencesError,
      banner,
      incomingCall,
      emergencyAssist,
      newBooking,
      refreshPermission,
      requestPermission,
      registerDevice,
      refreshPreferences,
      updatePreference,
      sendTest,
      showBanner,
      dismissBanner,
      dismissIncomingCall,
      dismissEmergencyAssist,
      dismissNewBooking,
      unregisterCurrentDevice,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
