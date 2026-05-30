import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  useNotifications,
  type EmergencyAssistInfo,
  type EmergencyLocationConfidence,
} from '@/context/NotificationProvider';
import { WORKSHOP } from '@/lib/workshop';
import { AdminButton } from '@/components/ui/AdminButton';
import { AnimatedBorder } from '@/components/ui/AnimatedBorder';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/theme/colors';
import {
  buildNavigationUrl,
  buildStaticMapUrl,
  fetchDrivingDirections,
  hasMapboxToken,
  haversineMiles,
  reverseGeocode,
  type DirectionsResult,
} from '@/lib/mapbox';

const PROBLEM_LABELS: Record<string, string> = {
  PUNCTURE_OR_FLAT: 'Puncture / flat',
  DAMAGED_OR_BLOWN_OUT: 'Damaged / blown out',
  SLOW_PRESSURE_LOSS: 'Slow pressure loss',
  NEEDS_REPLACEMENT: 'Needs replacement',
  NOT_SURE: 'Not sure',
};

function locationStatus(conf: EmergencyLocationConfidence | null): {
  label: string;
  color: string;
} {
  switch (conf) {
    case 'CONFIRMED_ADDRESS':
      return { label: 'Address confirmed', color: colors.successBright };
    case 'GPS_ONLY':
      return { label: 'GPS-only location', color: colors.goldBright };
    case 'WEAK_ADDRESS':
      return { label: 'Partial address', color: colors.warningBright };
    case 'MISSING_LOCATION':
      return { label: 'No location', color: colors.dangerBright };
    default:
      return { label: 'Waiting for location', color: colors.textDim };
  }
}

function formatMiles(miles: number): string {
  if (!Number.isFinite(miles)) return '—';
  if (miles < 0.1) return '< 0.1 mi';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes)) return '—';
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} h` : `${h} h ${rem} min`;
}

function formatElapsed(startedAt: string): string {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return '';
  const diff = Math.max(0, Date.now() - started);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

/**
 * EmergencyAssistPopup
 *
 * Sticky modal triggered when a customer clicks "I need help now". Shows
 * captured context, a Mapbox snapshot of the customer location relative to
 * the workshop, straight-line + driving distance + ETA, reverse-geocoded
 * address, and quick actions (Action Queue, Quick Booking with prefill,
 * Call, WhatsApp, Open in Google Maps).
 *
 * Per business rules: never books, never charges, never decrements stock.
 */
export function EmergencyAssistPopup(): React.JSX.Element | null {
  const { emergencyAssist, dismissEmergencyAssist, markActiveLeadInProgress, queueCount } =
    useNotifications();
  const beat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!emergencyAssist) {
      beat.stopAnimation();
      beat.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(beat, {
          toValue: 0,
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return (): void => {
      loop.stop();
    };
  }, [emergencyAssist, beat]);

  // Live elapsed timer — re-render every 15s so the "Xm ago" stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!emergencyAssist) return;
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return (): void => clearInterval(id);
  }, [emergencyAssist]);

  if (!emergencyAssist) return null;

  return (
    <PopupBody
      info={emergencyAssist}
      beat={beat}
      onDismiss={dismissEmergencyAssist}
      onStarted={markActiveLeadInProgress}
      queueCount={queueCount}
    />
  );
}

function PopupBody({
  info,
  beat,
  onDismiss,
  onStarted,
  queueCount,
}: {
  info: EmergencyAssistInfo;
  beat: Animated.Value;
  onDismiss: () => void;
  onStarted: () => void;
  queueCount: number;
}): React.JSX.Element {
  const status = locationStatus(info.locationConfidence);
  const refShort = info.eventId.slice(0, 8);
  const hasCustomerCoords =
    typeof info.latitude === 'number' &&
    typeof info.longitude === 'number' &&
    Number.isFinite(info.latitude) &&
    Number.isFinite(info.longitude);

  const customerPoint = hasCustomerCoords
    ? { latitude: info.latitude as number, longitude: info.longitude as number }
    : null;

  const straightMiles = useMemo(
    () =>
      customerPoint
        ? haversineMiles(
            { latitude: WORKSHOP.latitude, longitude: WORKSHOP.longitude },
            customerPoint,
          )
        : null,
    [customerPoint],
  );

  const mapUrl = useMemo(
    () =>
      customerPoint
        ? buildStaticMapUrl({
            customer: customerPoint,
            workshop: { latitude: WORKSHOP.latitude, longitude: WORKSHOP.longitude },
            width: 420,
            height: 220,
          })
        : null,
    [customerPoint],
  );

  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [geocoded, setGeocoded] = useState<{
    formatted: string | null;
    postcode: string | null;
  } | null>(null);
  // Tracks which primary action is currently navigating, so we can show a
  // loading state and prevent duplicate taps. Always reset in finally so the
  // popup is never permanently locked.
  const [busyAction, setBusyAction] = useState<'quick_booking' | 'action_queue' | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!customerPoint) {
      setDirections(null);
      setGeocoded(null);
      return;
    }
    const ac = new AbortController();
    void fetchDrivingDirections(
      { latitude: WORKSHOP.latitude, longitude: WORKSHOP.longitude },
      customerPoint,
      ac.signal,
    ).then((res) => {
      if (!ac.signal.aborted) setDirections(res);
    });
    void reverseGeocode(customerPoint, ac.signal).then((res) => {
      if (!ac.signal.aborted) setGeocoded(res);
    });
    return (): void => ac.abort();
  }, [customerPoint]);

  const displayAddress = info.locationLabel ?? geocoded?.formatted ?? null;
  const displayPostcode = geocoded?.postcode ?? null;

  function openActionQueue(): void {
    if (busyAction) return;
    setBusyAction('action_queue');
    try {
      onDismiss();
      router.push('/action-queue');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[EmergencyAssistPopup] open action queue failed', err);
      toast.error('Could not open Action Queue.');
    } finally {
      setBusyAction(null);
    }
  }

  function openQuickBooking(): void {
    if (busyAction) return;
    setBusyAction('quick_booking');
    try {
      onStarted();
      const params = new URLSearchParams();
      if (info.phone) params.set('phone', info.phone);
      if (info.customerName) params.set('customerName', info.customerName);
      if (info.tyreProblemType) params.set('tyreProblemType', info.tyreProblemType);
      if (info.jobType) params.set('jobType', info.jobType);
      if (info.vehicleRegistration)
        params.set('vehicleRegistration', info.vehicleRegistration);
      const fullAddress = displayAddress ?? info.locationLabel ?? '';
      if (fullAddress) params.set('locationLabel', fullAddress);
      if (typeof info.latitude === 'number')
        params.set('latitude', String(info.latitude));
      if (typeof info.longitude === 'number')
        params.set('longitude', String(info.longitude));
      if (displayPostcode) params.set('postcode', displayPostcode);
      params.set('prefillSource', 'emergency_assist');
      onDismiss();
      const qs = params.toString();
      router.push(qs ? `/quick-booking?${qs}` : '/quick-booking');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[EmergencyAssistPopup] open quick booking failed', err);
      toast.error('Could not open Quick Booking. Please try again.');
    } finally {
      setBusyAction(null);
    }
  }

  function callCustomer(): void {
    if (!info.phone) return;
    void Linking.openURL(`tel:${info.phone}`).catch(() => {
      // best-effort
    });
  }

  function whatsappCustomer(): void {
    if (!info.phone) return;
    const digits = info.phone.replace(/[^\d]/g, '');
    if (!digits) return;
    void Linking.openURL(`https://wa.me/${digits}`).catch(() => {
      // best-effort
    });
  }

  function openInMaps(): void {
    if (!customerPoint) return;
    const url = buildNavigationUrl(customerPoint, displayAddress ?? undefined);
    void Linking.openURL(url).catch(() => {
      // best-effort
    });
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 28,
          paddingBottom: 32,
        }}
      >
        <View style={{ width: '100%', maxWidth: 460, position: 'relative' }}>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -16,
              left: -16,
              right: -16,
              bottom: -16,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: colors.goldBright,
              opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.75] }),
            }}
          />
          <Animated.View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.goldBright,
              borderWidth: 1,
              borderRadius: 12,
              shadowColor: colors.goldBright,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
              shadowRadius: beat.interpolate({ inputRange: [0, 1], outputRange: [10, 24] }),
              elevation: 12,
              overflow: 'hidden',
              maxHeight: '92%',
            }}
          >
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 4,
                }}
              >
                <Text style={{ color: colors.goldBright, fontSize: 18, fontWeight: '700' }}>
                  Emergency assist started
                </Text>
                <Text style={{ color: colors.textDim, fontSize: 11 }}>
                  {formatElapsed(info.receivedAt)}
                </Text>
              </View>
              <Text style={{ color: colors.textDim, fontSize: 11, marginBottom: 12 }}>
                Ref {refShort}
              </Text>
              {queueCount > 0 ? (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    marginBottom: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: colors.surfaceSoft,
                    borderWidth: 1,
                    borderColor: colors.goldBright,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Text style={{ color: colors.goldBright, fontSize: 12, fontWeight: '700' }}>
                    +{queueCount} waiting
                  </Text>
                  <Text
                    onPress={() => {
                      onDismiss();
                      router.push('/incoming-leads');
                    }}
                    style={{ color: colors.textLight, fontSize: 11, textDecorationLine: 'underline' }}
                  >
                    View leads
                  </Text>
                </View>
              ) : null}
              <Text style={{ color: colors.textLight, fontSize: 14, marginBottom: 12 }}>
                A customer clicked &quot;I need help now&quot; on the quote page.
              </Text>

              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: status.color,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: status.color, fontSize: 12, fontWeight: '600' }}>
                  {status.label}
                </Text>
              </View>

              {mapUrl ? (
                <AnimatedBorder
                  radius={10}
                  strokeWidth={2}
                  color="#F01825"
                  segmentLength={120}
                  durationMs={2400}
                  style={{
                    borderRadius: 10,
                    overflow: 'hidden',
                    marginBottom: 12,
                  }}
                >
                  <Image
                    source={{ uri: mapUrl }}
                    style={{ width: '100%', height: 200 }}
                    resizeMode="cover"
                  />
                </AnimatedBorder>
              ) : hasCustomerCoords && !hasMapboxToken() ? (
                <Text style={{ color: colors.warningBright, fontSize: 11, marginBottom: 12 }}>
                  Map unavailable — EXPO_PUBLIC_MAPBOX_TOKEN is not set.
                </Text>
              ) : null}

              {customerPoint && (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <Pill
                    label="Straight line"
                    value={straightMiles !== null ? formatMiles(straightMiles) : '—'}
                  />
                  <Pill
                    label="Driving"
                    value={
                      directions ? formatMiles(directions.distanceMiles) : 'Calculating…'
                    }
                  />
                  <Pill
                    label="ETA*"
                    value={directions ? formatDuration(directions.durationMinutes) : '—'}
                    muted
                  />
                </View>
              )}

              <View style={{ marginBottom: 16, gap: 6 }}>
                <Row
                  label="Phone"
                  value={info.phone ?? '—'}
                  highlight={Boolean(info.phone)}
                />
                <Row label="Name" value={info.customerName ?? '—'} />
                <Row label="Vehicle" value={info.vehicleRegistration ?? '—'} />
                <Row
                  label="Problem"
                  value={
                    info.tyreProblemType
                      ? (PROBLEM_LABELS[info.tyreProblemType] ?? info.tyreProblemType)
                      : '—'
                  }
                />
                <Row label="Job type" value={info.jobType ?? '—'} />
                <Row label="Address" value={displayAddress ?? '—'} />
                {displayPostcode && (
                  <Row label="Postcode" value={displayPostcode} highlight />
                )}
                {customerPoint && (
                  <Row
                    label="Coords"
                    value={`${customerPoint.latitude.toFixed(5)}, ${customerPoint.longitude.toFixed(5)}`}
                  />
                )}
                <Row
                  label="From page"
                  value={info.sourcePage ?? info.sourceComponent ?? '—'}
                />
                <Row label="Workshop" value={WORKSHOP.address} />
              </View>

              <View style={{ gap: 12 }}>
                <AdminButton
                  label="Open Quick Booking"
                  loadingLabel="Opening…"
                  loading={busyAction === 'quick_booking'}
                  disabled={busyAction !== null && busyAction !== 'quick_booking'}
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={openQuickBooking}
                />
                <AdminButton
                  label="Open Action Queue"
                  loadingLabel="Opening…"
                  loading={busyAction === 'action_queue'}
                  disabled={busyAction !== null && busyAction !== 'action_queue'}
                  variant="secondary"
                  size="md"
                  fullWidth
                  onPress={openActionQueue}
                />
                {customerPoint && (
                  <AdminButton
                    label="Open in Google Maps"
                    variant="subtle"
                    size="md"
                    fullWidth
                    onPress={openInMaps}
                  />
                )}
                {info.phone && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <AdminButton
                        label="Call customer"
                        variant="primary"
                        size="md"
                        fullWidth
                        onPress={callCustomer}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AdminButton
                        label="WhatsApp"
                        variant="whatsapp"
                        size="md"
                        fullWidth
                        onPress={whatsappCustomer}
                      />
                    </View>
                  </View>
                )}
                <AdminButton
                  label="Dismiss"
                  variant="ghost"
                  size="md"
                  fullWidth
                  onPress={onDismiss}
                />
                <Text
                  style={{ color: colors.textGhost, fontSize: 10, textAlign: 'center', marginTop: 4 }}
                >
                  *Driving distance / time are estimates from Mapbox and exclude live traffic.
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Text style={{ color: colors.textDim, fontSize: 13, minWidth: 84 }}>{label}</Text>
      <Text
        style={{
          color: highlight ? colors.goldBright : colors.textLight,
          fontSize: 13,
          fontWeight: highlight ? '700' : '500',
          flexShrink: 1,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function Pill({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surfaceSoft,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ color: colors.textDim, fontSize: 10, marginBottom: 2 }}>{label}</Text>
      <Text style={{ color: muted ? colors.textMuted : colors.goldBright, fontSize: 13, fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}
