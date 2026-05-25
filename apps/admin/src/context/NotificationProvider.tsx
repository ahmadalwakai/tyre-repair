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
import { playSound, playSoundLoop, stopSound, setUiFeedbackEnabled } from '@/lib/sound/play-sound';
import { subscribePrivate } from '@/lib/realtime/client';
import { getRecentUnhandledCallClicks } from '@/lib/api/call-click-events';
import type {
  AdminNotificationCategory,
  AdminNotificationPreferenceState,
  InAppNotification,
  NotificationPermissionStatusResult,
  PushRegistrationStatus,
} from '@/lib/notifications/types';
import type { IncomingLead, IncomingLeadStatus } from '@/types/incoming-leads';
import {
  createLeadFromCallClick,
  createLeadFromEmergencyAssist,
  dedupeIncomingLead,
  isLeadExpired,
  mergeLocationIntoLead,
  setLeadStatus,
  sortIncomingLeads,
} from '@/lib/incoming-leads/lead-queue';
import { shouldPlayFullLeadSound } from '@/lib/incoming-leads/sound-policy';

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
      const isBuyTyres = String(p['source'] ?? '') === 'tyre_shop';
      const fittingMethod = String(p['fittingMethod'] ?? '');
      const fittingLabel =
        fittingMethod === 'HOME'
          ? ' • home fitting'
          : fittingMethod === 'GARAGE'
            ? ' • garage fitting'
            : '';
      return {
        title: isBuyTyres ? 'New Buy Tyres order' : 'New booking confirmed',
        body: `${customer} • ${total}${isBuyTyres ? fittingLabel : ''}`,
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
  // Unified incoming-leads queue (Call Now + Emergency Assist + Callback).
  incomingLeads: IncomingLead[];
  incomingLeadHistory: IncomingLead[];
  activeLead: IncomingLead | null;
  queueCount: number;
  lastLeadReceivedAt: string | null;
  lastLeadSoundAt: number | null;
  lastPopupShownAt: string | null;
  lastRealtimeEventName: string | null;
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
  // Unified queue actions.
  markActiveLeadInProgress: () => void;
  markLeadHandled: (leadId: string) => void;
  dismissLead: (leadId: string) => void;
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
  networkCity: string | null;
  networkRegion: string | null;
  networkCountry: string | null;
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
  const [newBooking, setNewBooking] = useState<NewBookingInfo | null>(null);
  // Unified incoming-leads queue: any NEW/VIEWED/IN_PROGRESS lead lives here.
  const [incomingLeads, setIncomingLeads] = useState<IncomingLead[]>([]);
  const [incomingLeadHistory, setIncomingLeadHistory] = useState<IncomingLead[]>([]);
  const [lastLeadReceivedAt, setLastLeadReceivedAt] = useState<string | null>(null);
  const [lastLeadSoundAt, setLastLeadSoundAt] = useState<number | null>(null);
  const [lastPopupShownAt, setLastPopupShownAt] = useState<string | null>(null);
  const [lastRealtimeEventName, setLastRealtimeEventName] = useState<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const adminChannelRef = useRef<Channel | null>(null);
  const preferencesRef = useRef<AdminNotificationPreferenceState>(preferences);
  const incomingLeadsRef = useRef<IncomingLead[]>([]);
  const lastLeadSoundAtRef = useRef<number | null>(null);
  useEffect(() => { incomingLeadsRef.current = incomingLeads; }, [incomingLeads]);
  useEffect(() => { lastLeadSoundAtRef.current = lastLeadSoundAt; }, [lastLeadSoundAt]);

  // Sort once and pick the highest-priority NEW/VIEWED lead as the active popup.
  const sortedLeads = useMemo<IncomingLead[]>(
    () => sortIncomingLeads(incomingLeads),
    [incomingLeads],
  );
  const activeLead = useMemo<IncomingLead | null>(() => {
    for (const l of sortedLeads) {
      if (l.status === 'NEW' || l.status === 'VIEWED') return l;
    }
    return null;
  }, [sortedLeads]);
  const queueCount = useMemo<number>(
    () =>
      sortedLeads.filter((l) => l.status === 'NEW' || l.status === 'VIEWED').length -
      (activeLead ? 1 : 0),
    [sortedLeads, activeLead],
  );

  // Existing popup contracts: derive IncomingCallInfo / EmergencyAssistInfo
  // from the active lead. Components keep working unchanged.
  const incomingCall = useMemo<IncomingCallInfo | null>(() => {
    if (!activeLead || activeLead.type !== 'CALL_CLICK') return null;
    const meta = activeLead.metadata ?? {};
    const metaStr = (k: string): string | null => {
      const v = meta[k];
      return typeof v === 'string' && v.length > 0 ? v : null;
    };
    return {
      callClickEventId: activeLead.callClickEventId ?? '',
      phone: activeLead.phone ?? null,
      customerName: activeLead.customerName ?? null,
      tyreProblemType: activeLead.tyreProblemType ?? null,
      jobType: (activeLead.jobType as 'ASSESSMENT' | 'REPLACEMENT' | undefined) ?? null,
      sourcePage: activeLead.sourcePage ?? null,
      sourceComponent: activeLead.sourceComponent ?? null,
      networkCity: metaStr('networkCity'),
      networkRegion: metaStr('networkRegion'),
      networkCountry: metaStr('networkCountry'),
      receivedAt: activeLead.createdAt,
    };
  }, [activeLead]);
  const emergencyAssist = useMemo<EmergencyAssistInfo | null>(() => {
    if (!activeLead || activeLead.type !== 'EMERGENCY_ASSIST') return null;
    return {
      eventId: activeLead.emergencyAssistEventId ?? '',
      phone: activeLead.phone ?? null,
      customerName: activeLead.customerName ?? null,
      tyreProblemType: activeLead.tyreProblemType ?? null,
      jobType: (activeLead.jobType as 'ASSESSMENT' | 'REPLACEMENT' | undefined) ?? null,
      vehicleRegistration: activeLead.vehicleRegistration ?? null,
      sourcePage: activeLead.sourcePage ?? null,
      sourceComponent: activeLead.sourceComponent ?? null,
      receivedAt: activeLead.createdAt,
      locationLabel: activeLead.locationLabel ?? null,
      latitude: activeLead.latitude ?? null,
      longitude: activeLead.longitude ?? null,
      locationConfidence:
        (activeLead.locationConfidence as EmergencyLocationConfidence | undefined) ?? null,
      locationUpdatedAt:
        activeLead.lastSignalAt && activeLead.lastSignalAt !== activeLead.createdAt
          ? activeLead.lastSignalAt
          : null,
    };
  }, [activeLead]);

  // Track when a popup becomes visible for diagnostics, and start the alert
  // loop the moment a new active lead is shown. This is the authoritative
  // sound trigger — running in an effect after commit guarantees the popup
  // is on screen and avoids any race with the enqueue path.
  const lastSoundedLeadIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeLead) {
      lastSoundedLeadIdRef.current = null;
      return;
    }
    setLastPopupShownAt(new Date().toISOString());
    if (lastSoundedLeadIdRef.current === activeLead.id) return;
    const shouldPlay = shouldPlayFullLeadSound({
      lastLeadSoundAt: lastLeadSoundAtRef.current,
      incomingLead: activeLead,
      activeLead: null,
      queueCount: incomingLeadsRef.current.length - 1,
    });
    if (!shouldPlay) return;
    if (!preferencesRef.current.soundEnabled) return;
    lastSoundedLeadIdRef.current = activeLead.id;
    // Use the generic, known-good play-sound system. Distinct ringtone per
    // lead type so the admin can tell call vs emergency apart instantly.
    const key = activeLead.type === 'EMERGENCY_ASSIST' ? 'emergency_alert' : 'incoming_call';
    void playSoundLoop(key);
    const now = Date.now();
    lastLeadSoundAtRef.current = now;
    setLastLeadSoundAt(now);
  }, [activeLead]);

  // Enqueue helper: dedupe + push to queue. Sound is started by the
  // activeLead effect above so the popup and sound stay in sync.
  const enqueueLead = useCallback((lead: IncomingLead): void => {
    setLastLeadReceivedAt(new Date().toISOString());
    const currentLeads = incomingLeadsRef.current;
    const result = dedupeIncomingLead(currentLeads, lead);
    setIncomingLeads(result.leads);
    incomingLeadsRef.current = result.leads;
  }, []);

  const transitionLead = useCallback(
    (leadId: string, status: IncomingLeadStatus): void => {
      setIncomingLeads((current) => {
        const next = setLeadStatus(current, leadId, status);
        if (status === 'HANDLED' || status === 'DISMISSED' || status === 'EXPIRED') {
          const moving = next.find((l) => l.id === leadId);
          if (moving) {
            setIncomingLeadHistory((h) => [moving, ...h].slice(0, 100));
            return next.filter((l) => l.id !== leadId);
          }
        }
        return next;
      });
    },
    [],
  );

  const markActiveLeadInProgress = useCallback((): void => {
    const current = incomingLeadsRef.current;
    const sorted = sortIncomingLeads(current);
    const active = sorted.find((l) => l.status === 'NEW' || l.status === 'VIEWED');
    if (!active) return;
    transitionLead(active.id, 'IN_PROGRESS');
  }, [transitionLead]);

  const markLeadHandled = useCallback(
    (leadId: string): void => {
      transitionLead(leadId, 'HANDLED');
    },
    [transitionLead],
  );

  const dismissLead = useCallback(
    (leadId: string): void => {
      transitionLead(leadId, 'DISMISSED');
    },
    [transitionLead],
  );

  // Periodic expiry sweep — moves stale leads to history so they don't block popups.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      let any = false;
      const current = incomingLeadsRef.current;
      for (const l of current) {
        if ((l.status === 'NEW' || l.status === 'VIEWED' || l.status === 'IN_PROGRESS') && isLeadExpired(l, now)) {
          transitionLead(l.id, 'EXPIRED');
          any = true;
        }
      }
      if (any) {
        // tick — state updates already handled inside transitionLead
      }
    }, 30000);
    return (): void => clearInterval(id);
  }, [transitionLead]);

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
    // Map onto the unified queue: dismiss the active CALL_CLICK lead.
    const sorted = sortIncomingLeads(incomingLeadsRef.current);
    const active = sorted.find(
      (l) => (l.status === 'NEW' || l.status === 'VIEWED') && l.type === 'CALL_CLICK',
    );
    if (active) transitionLead(active.id, 'DISMISSED');
  }, [transitionLead]);

  const dismissEmergencyAssist = useCallback((): void => {
    const sorted = sortIncomingLeads(incomingLeadsRef.current);
    const active = sorted.find(
      (l) => (l.status === 'NEW' || l.status === 'VIEWED') && l.type === 'EMERGENCY_ASSIST',
    );
    if (active) transitionLead(active.id, 'DISMISSED');
  }, [transitionLead]);

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
      setUiFeedbackEnabled(prefs.soundEnabled);
      if (prefs.soundEnabled) {
        void playSound('toast_info');
      }
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
      setNewBooking(null);
      setIncomingLeads([]);
      setIncomingLeadHistory([]);
      setLastLeadReceivedAt(null);
      setLastLeadSoundAt(null);
      setLastPopupShownAt(null);
      setLastRealtimeEventName(null);
    }
  }, [admin, refreshPreferences]);

  // Subscribe to private-admin pusher channel for in-app banners while app is open.
  useEffect(() => {
    if (!admin) return undefined;
    const ch = subscribePrivate('private-admin');
    if (!ch) return undefined;
    adminChannelRef.current = ch;
    const handler = (event: { type: string; payload: Record<string, unknown>; createdAt?: string }): void => {
      setLastRealtimeEventName(event.type);
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

    // Call Now: customer tapped a tel: link on the public site. Funnels into
    // the unified incoming-leads queue so multiple call clicks never spawn
    // overlapping popups.
    const callHandler = (event: {
      type: string;
      payload: Record<string, unknown>;
      createdAt?: string;
    }): void => {
      setLastRealtimeEventName(event.type);
      const p = event.payload ?? {};
      const eventId = String(p['callClickEventId'] ?? '');
      if (!eventId) return;
      const lead = createLeadFromCallClick({
        callClickEventId: eventId,
        phone: p['phone'] != null ? String(p['phone']) : null,
        customerName: p['customerName'] != null ? String(p['customerName']) : null,
        tyreProblemType:
          p['tyreProblemType'] != null ? String(p['tyreProblemType']) : null,
        jobType: (p['jobType'] as 'ASSESSMENT' | 'REPLACEMENT' | undefined) ?? null,
        sourcePage: p['sourcePage'] != null ? String(p['sourcePage']) : null,
        sourceComponent:
          p['sourceComponent'] != null ? String(p['sourceComponent']) : null,
        networkCity: p['networkCity'] != null ? String(p['networkCity']) : null,
        networkRegion: p['networkRegion'] != null ? String(p['networkRegion']) : null,
        networkCountry: p['networkCountry'] != null ? String(p['networkCountry']) : null,
        receivedAt: event.createdAt ?? null,
      });
      enqueueLead(lead);
    };
    ch.bind('lead.call.clicked', callHandler);

    // Emergency assist: customer pressed "I need help now". Routes through
    // the unified queue with full dedupe by emergencyAssistEventId.
    const emergencyHandler = (event: {
      type: string;
      payload: Record<string, unknown>;
      createdAt?: string;
    }): void => {
      setLastRealtimeEventName(event.type);
      const p = event.payload ?? {};
      const eventId = String(p['eventId'] ?? '');
      if (!eventId) return;
      const lead = createLeadFromEmergencyAssist({
        eventId,
        phone: p['customerPhone'] != null ? String(p['customerPhone']) : null,
        customerName: p['customerName'] != null ? String(p['customerName']) : null,
        tyreProblemType:
          p['tyreProblemType'] != null ? String(p['tyreProblemType']) : null,
        jobType: (p['jobType'] as 'ASSESSMENT' | 'REPLACEMENT' | undefined) ?? null,
        vehicleRegistration:
          p['vehicleRegistration'] != null ? String(p['vehicleRegistration']) : null,
        sourcePage: p['sourcePage'] != null ? String(p['sourcePage']) : null,
        sourceComponent:
          p['sourceComponent'] != null ? String(p['sourceComponent']) : null,
        locationLabel:
          p['locationLabel'] != null ? String(p['locationLabel']) : null,
        latitude: typeof p['latitude'] === 'number' ? (p['latitude'] as number) : null,
        longitude: typeof p['longitude'] === 'number' ? (p['longitude'] as number) : null,
        locationConfidence:
          p['locationConfidence'] != null ? String(p['locationConfidence']) : null,
        receivedAt: event.createdAt ?? null,
      });
      enqueueLead(lead);
    };
    ch.bind('emergency_assist.created', emergencyHandler);

    // Emergency assist location update: merge into the existing lead in the
    // queue. Never spawns a duplicate popup. Never plays the full sound.
    const emergencyLocationHandler = (event: {
      type: string;
      payload: Record<string, unknown>;
      createdAt?: string;
    }): void => {
      setLastRealtimeEventName(event.type);
      const p = event.payload ?? {};
      const eventId = String(p['eventId'] ?? '');
      if (!eventId) return;
      const leadId = `ea-${eventId}`;
      setIncomingLeads((current) => {
        const idx = current.findIndex((l) => l.id === leadId);
        if (idx < 0) return current;
        const prev = current[idx];
        if (!prev) return current;
        const next = [...current];
        next[idx] = mergeLocationIntoLead(prev, {
          eventId,
          locationLabel:
            p['locationLabel'] != null ? String(p['locationLabel']) : null,
          latitude:
            typeof p['latitude'] === 'number' ? (p['latitude'] as number) : null,
          longitude:
            typeof p['longitude'] === 'number' ? (p['longitude'] as number) : null,
          locationConfidence:
            p['locationConfidence'] != null ? String(p['locationConfidence']) : null,
          updatedAt: event.createdAt ?? new Date().toISOString(),
        });
        return next;
      });
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
      if (preferencesRef.current.soundEnabled) {
        void playSound('new_booking');
      }
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
  }, [admin, showBanner, enqueueLead]);

  // Foreground replay: if a call-click event was missed while the app was
  // backgrounded, fetch the most recent unhandled one on resume and surface
  // it through the unified incoming-leads queue. Replayed events are tracked
  // per session so the same id never triggers the popup twice.
  const replayedCallClickIds = useRef<Set<string>>(new Set());

  const replayLatestUnhandledCallClick = useCallback(async (): Promise<void> => {
    try {
      const res = await getRecentUnhandledCallClicks({ minutes: 30, limit: 1 });
      const latest = res.items[0];
      if (!latest) return;
      if (replayedCallClickIds.current.has(latest.id)) return;
      replayedCallClickIds.current.add(latest.id);
      const lead = createLeadFromCallClick({
        callClickEventId: latest.id,
        phone: latest.phone ?? null,
        customerName: latest.customerName ?? null,
        tyreProblemType: latest.tyreProblemType ?? null,
        jobType: latest.jobType ?? null,
        sourcePage: latest.sourcePage ?? null,
        sourceComponent: latest.sourceComponent ?? null,
        networkCity: latest.networkCity ?? null,
        networkRegion: latest.networkRegion ?? null,
        networkCountry: latest.networkCountry ?? null,
        receivedAt: latest.createdAt,
      });
      enqueueLead(lead);
    } catch {
      // best effort
    }
  }, [enqueueLead]);

  // Stop the looping alert as soon as no popup-bearing lead is active.
  useEffect(() => {
    if (!incomingCall && !emergencyAssist) {
      void stopSound('incoming_call');
      void stopSound('emergency_alert');
    }
  }, [incomingCall, emergencyAssist]);

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
      incomingLeads: sortedLeads,
      incomingLeadHistory,
      activeLead,
      queueCount,
      lastLeadReceivedAt,
      lastLeadSoundAt,
      lastPopupShownAt,
      lastRealtimeEventName,
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
      markActiveLeadInProgress,
      markLeadHandled,
      dismissLead,
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
      sortedLeads,
      incomingLeadHistory,
      activeLead,
      queueCount,
      lastLeadReceivedAt,
      lastLeadSoundAt,
      lastPopupShownAt,
      lastRealtimeEventName,
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
      markActiveLeadInProgress,
      markLeadHandled,
      dismissLead,
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
