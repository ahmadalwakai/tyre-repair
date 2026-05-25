import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  useNotifications,
  type NewBookingInfo,
} from '@/context/NotificationProvider';
import { WORKSHOP } from '@/lib/workshop';
import { AdminButton } from '@/components/ui/AdminButton';
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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  // UK locale, 24h, includes date + time.
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * NewBookingPopup
 *
 * Modal triggered when a customer's payment succeeds and a booking is
 * confirmed (booking.created event). Shows a Mapbox snapshot of the customer
 * location relative to the workshop, straight-line + driving distance + ETA,
 * reverse-geocoded address, and quick actions: View Booking, Call, WhatsApp,
 * Open in Google Maps.
 *
 * Less aggressive than EmergencyAssistPopup — single beat (no loop).
 */
export function NewBookingPopup(): React.JSX.Element | null {
  const { newBooking, dismissNewBooking } = useNotifications();
  const beat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!newBooking) {
      beat.stopAnimation();
      beat.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, {
          toValue: 1,
          duration: 460,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(beat, {
          toValue: 0,
          duration: 460,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
      { iterations: 4 },
    );
    loop.start();
    return (): void => {
      loop.stop();
    };
  }, [newBooking, beat]);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!newBooking) return;
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return (): void => clearInterval(id);
  }, [newBooking]);

  if (!newBooking) return null;
  return <PopupBody info={newBooking} beat={beat} onDismiss={dismissNewBooking} />;
}

function PopupBody({
  info,
  beat,
  onDismiss,
}: {
  info: NewBookingInfo;
  beat: Animated.Value;
  onDismiss: () => void;
}): React.JSX.Element {
  const trackShort = info.trackingId;
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
  const displayPostcode = info.postcode ?? geocoded?.postcode ?? null;
  // Loading state for the primary navigation button. Always reset in finally
  // so the popup is never permanently locked if router.push fails.
  const [busyOpen, setBusyOpen] = useState(false);
  const toast = useToast();

  function openBookings(): void {
    if (busyOpen) return;
    setBusyOpen(true);
    try {
      onDismiss();
      router.push('/bookings');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[NewBookingPopup] open bookings failed', err);
      toast.error('Could not open Bookings.');
    } finally {
      setBusyOpen(false);
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

  const accent = info.paymentMode === 'DEPOSIT' ? colors.infoBright : colors.successBright;
  const heading =
    info.paymentMode === 'DEPOSIT'
      ? 'New booking — deposit paid'
      : 'New booking — paid in full';

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
              borderColor: accent,
              opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.6] }),
            }}
          />
          <Animated.View
            style={{
              backgroundColor: colors.surface,
              borderColor: accent,
              borderWidth: 1,
              borderRadius: 12,
              shadowColor: accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }),
              shadowRadius: beat.interpolate({ inputRange: [0, 1], outputRange: [10, 20] }),
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
                <Text style={{ color: accent, fontSize: 18, fontWeight: '700' }}>
                  {heading}
                </Text>
                <Text style={{ color: colors.textDim, fontSize: 11 }}>
                  {formatElapsed(info.receivedAt)}
                </Text>
              </View>
              <Text style={{ color: colors.textDim, fontSize: 11, marginBottom: 12 }}>
                {trackShort}
              </Text>
              <Text style={{ color: colors.textLight, fontSize: 14, marginBottom: 12 }}>
                {info.customerName} just booked.{' '}
                {info.paymentMode === 'DEPOSIT'
                  ? 'Deposit captured — balance due on completion.'
                  : 'Full amount captured.'}
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <Pill
                  label="Total"
                  value={`£${info.totalPriceGbp}`}
                  color={accent}
                />
                <Pill
                  label="Job"
                  value={info.jobType ?? '—'}
                />
                {info.lockingWheelNutStatus === 'NO_KEY' && (
                  <Pill label="⚠ Nut" value="No key" color={colors.dangerBright} />
                )}
              </View>

              {mapUrl ? (
                <View
                  style={{
                    borderRadius: 10,
                    overflow: 'hidden',
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Image
                    source={{ uri: mapUrl }}
                    style={{ width: '100%', height: 200 }}
                    resizeMode="cover"
                  />
                </View>
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
                  label="Customer"
                  value={info.customerName}
                  highlight
                />
                <Row
                  label="Phone"
                  value={info.phone || '—'}
                  highlight={Boolean(info.phone)}
                />
                {info.customerEmail && (
                  <Row label="Email" value={info.customerEmail} />
                )}
                <Row label="Vehicle" value={info.vehicleRegistration ?? '—'} />
                <Row
                  label="Problem"
                  value={
                    info.tyreProblemType
                      ? (PROBLEM_LABELS[info.tyreProblemType] ?? info.tyreProblemType)
                      : '—'
                  }
                />
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
                <Row label="Workshop" value={WORKSHOP.address} />
                <Row
                  label="Quote made"
                  value={
                    info.quoteCreatedAt
                      ? `${formatDateTime(info.quoteCreatedAt)} (${formatElapsed(info.quoteCreatedAt)})`
                      : '—'
                  }
                />
                <Row
                  label="Paid at"
                  value={`${formatDateTime(info.receivedAt)} (${formatElapsed(info.receivedAt)})`}
                  highlight
                />
              </View>

              <View style={{ gap: 10 }}>
                <AdminButton
                  label="Open Bookings"
                  loadingLabel="Opening…"
                  loading={busyOpen}
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={openBookings}
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
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <AdminButton
                        label="Call"
                        variant="secondary"
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
  color,
}: {
  label: string;
  value: string;
  muted?: boolean;
  color?: string;
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
      <Text
        style={{
          color: color ?? (muted ? colors.textMuted : colors.goldBright),
          fontSize: 13,
          fontWeight: '700',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
