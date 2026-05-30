/**
 * LocationRequestPanel — Step 1 of Quick Booking.
 *
 * Generates a secure, short-lived location-capture link and lets the admin
 * deliver it to the customer by:
 *   • Share / copy (native share sheet — no contact details required)
 *   • SMS
 *   • Email
 *   • WhatsApp (wa.me deep link)
 *
 * Once a link has been generated, the panel polls the server every few
 * seconds for the customer's response. When the customer taps the link and
 * shares their GPS, the captured coordinates are pushed to the wizard via
 * onLocationReceived and Step 1 auto-fills.
 */
import * as React from 'react';
import { Animated, Easing, Linking, Pressable, Text, View } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { useToast } from '@/components/ui/Toast';
import { copyToClipboard } from '@/lib/clipboard';
import {
  fetchQuickBookingLocationStatus,
  requestQuickBookingLocation,
  type LocationRequestChannel,
  type LocationStatusResponse,
  type RequestLocationResponse,
} from '@/lib/api/quick-booking-helpers';

interface Props {
  /** Customer phone collected so far (may be empty). */
  customerPhone: string;
  /** Customer email collected so far (may be empty). */
  customerEmail: string;
  /** Optional name for personalisation in the email greeting. */
  customerName?: string;
  /**
   * Fired once the customer has tapped the secure link and shared their
   * GPS. The wizard uses this to auto-fill Step 1.
   */
  onLocationReceived?: (loc: {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
  }) => void;
}

type ChannelStatus =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; expiresInMinutes: number }
  | { kind: 'opened' }
  | { kind: 'copied'; expiresInMinutes: number }
  | { kind: 'error'; message: string };

type WaitingState =
  | { kind: 'idle' }
  | { kind: 'waiting'; token: string; startedAt: number }
  | { kind: 'received'; at: number }
  | { kind: 'expired' };

const RESEND_DEBOUNCE_MS = 4000;
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_DURATION_MS = 30 * 60 * 1000;

export function LocationRequestPanel({
  customerPhone,
  customerEmail,
  customerName,
  onLocationReceived,
}: Props): React.JSX.Element {
  const toast = useToast();
  const [smsStatus, setSmsStatus] = React.useState<ChannelStatus>({ kind: 'idle' });
  const [emailStatus, setEmailStatus] = React.useState<ChannelStatus>({ kind: 'idle' });
  const [whatsappStatus, setWhatsappStatus] = React.useState<ChannelStatus>({ kind: 'idle' });
  const [copyStatus, setCopyStatus] = React.useState<ChannelStatus>({ kind: 'idle' });
  const [waiting, setWaiting] = React.useState<WaitingState>({ kind: 'idle' });
  const lastTapRef = React.useRef<Record<LocationRequestChannel, number>>({
    SMS: 0,
    EMAIL: 0,
    WHATSAPP_LINK: 0,
    COPY_LINK: 0,
  });
  const receivedRef = React.useRef(false);

  const phoneOk = customerPhone.trim().length >= 7;
  const emailOk = /.+@.+\..+/.test(customerEmail.trim());

  const beginWaiting = React.useCallback((token: string) => {
    receivedRef.current = false;
    setWaiting({ kind: 'waiting', token, startedAt: Date.now() });
  }, []);

  // Poll for the customer's response while waiting.
  React.useEffect(() => {
    if (waiting.kind !== 'waiting') return;
    let cancelled = false;
    const token = waiting.token;
    const startedAt = waiting.startedAt;

    const tick = async (): Promise<void> => {
      if (cancelled) return;
      if (Date.now() - startedAt > POLL_MAX_DURATION_MS) {
        setWaiting({ kind: 'expired' });
        return;
      }
      try {
        const res: LocationStatusResponse = await fetchQuickBookingLocationStatus(token);
        if (cancelled) return;
        if (res.status === 'received' && typeof res.latitude === 'number' && typeof res.longitude === 'number') {
          if (!receivedRef.current) {
            receivedRef.current = true;
            onLocationReceived?.({
              latitude: res.latitude,
              longitude: res.longitude,
              accuracyMeters: res.accuracyMeters ?? null,
            });
            toast.show('Customer shared their location', 'success');
          }
          setWaiting({ kind: 'received', at: Date.now() });
          return;
        }
        if (res.status === 'expired' || res.status === 'invalid') {
          setWaiting({ kind: 'expired' });
          return;
        }
      } catch {
        // Swallow — try again on next tick.
      }
    };

    void tick();
    const id = setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [waiting, onLocationReceived, toast]);

  const sendChannel = React.useCallback(
    async (channel: LocationRequestChannel) => {
      const now = Date.now();
      if (now - lastTapRef.current[channel] < RESEND_DEBOUNCE_MS) return;
      lastTapRef.current[channel] = now;

      const setStatus =
        channel === 'SMS'
          ? setSmsStatus
          : channel === 'EMAIL'
            ? setEmailStatus
            : channel === 'WHATSAPP_LINK'
              ? setWhatsappStatus
              : setCopyStatus;
      setStatus({ kind: 'sending' });

      try {
        const payload: Parameters<typeof requestQuickBookingLocation>[0] = { channel };
        if (channel === 'SMS' || channel === 'WHATSAPP_LINK') payload.phone = customerPhone.trim();
        if (channel === 'EMAIL') payload.email = customerEmail.trim();
        if (customerName && customerName.trim()) payload.customerName = customerName.trim();

        const res: RequestLocationResponse = await requestQuickBookingLocation(payload);

        if (channel === 'COPY_LINK') {
          if (res.externalUrl) {
            const ok = await copyToClipboard(res.externalUrl);
            if (ok) {
              setStatus({ kind: 'copied', expiresInMinutes: res.expiresInMinutes });
              toast.success('Location link copied');
              beginWaiting(res.token);
            } else {
              setStatus({ kind: 'error', message: 'Copy failed' });
              toast.error('Copy failed');
            }
            return;
          }
          setStatus({ kind: 'error', message: 'Could not generate link' });
          toast.show('Could not generate link', 'error');
          return;
        }

        if (channel === 'WHATSAPP_LINK') {
          if (res.externalUrl) {
            const opened = await Linking.canOpenURL(res.externalUrl);
            if (opened) {
              await Linking.openURL(res.externalUrl);
              setStatus({ kind: 'opened' });
              toast.show('Opened WhatsApp', 'success');
              beginWaiting(res.token);
              return;
            }
          }
          setStatus({ kind: 'error', message: 'WhatsApp not available on this device' });
          toast.show('Could not open WhatsApp', 'error');
          return;
        }

        if (res.sent) {
          setStatus({ kind: 'sent', expiresInMinutes: res.expiresInMinutes });
          toast.show(
            channel === 'SMS' ? 'Location link sent by SMS' : 'Location link sent by email',
            'success',
          );
          beginWaiting(res.token);
          return;
        }

        const reason = res.skippedReason ?? 'send_failed';
        const human =
          reason === 'missing_credentials'
            ? channel === 'SMS'
              ? 'SMS not configured on the server'
              : 'Email not configured on the server'
            : reason === 'no_phone'
              ? 'Phone number missing'
              : reason === 'no_email'
                ? 'Email address missing'
                : 'Send failed — try again';
        setStatus({ kind: 'error', message: human });
        toast.show(human, 'error');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Send failed';
        setStatus({ kind: 'error', message });
        toast.show(message, 'error');
      }
    },
    [customerPhone, customerEmail, customerName, toast, beginWaiting],
  );

  return (
    <GoldCard
      title="Request customer location"
      icon="📡"
      eyebrow="Optional · sends a secure link"
    >
      <Text className="text-text-muted text-[11px] leading-5 mb-2">
        The customer taps the link and shares their exact location from their phone.
        Booking is not blocked if sending fails.
      </Text>

      <WaitingBanner state={waiting} />

      <View className="gap-2">
        <ChannelRow
          icon="🔗"
          label="Copy link"
          disabled={false}
          disabledReason=""
          status={copyStatus}
          onPress={() => void sendChannel('COPY_LINK')}
        />
        <ChannelRow
          icon="💬"
          label="Send by SMS"
          disabled={!phoneOk}
          disabledReason="Phone required"
          status={smsStatus}
          onPress={() => void sendChannel('SMS')}
        />
        <ChannelRow
          icon="📧"
          label="Send by email"
          disabled={!emailOk}
          disabledReason="Email required"
          status={emailStatus}
          onPress={() => void sendChannel('EMAIL')}
        />
        <ChannelRow
          icon="🟢"
          label="Open in WhatsApp"
          disabled={!phoneOk}
          disabledReason="Phone required"
          status={whatsappStatus}
          onPress={() => void sendChannel('WHATSAPP_LINK')}
        />
      </View>
    </GoldCard>
  );
}

/* ------------------------------ Waiting banner ------------------------------ */

function WaitingBanner({ state }: { state: WaitingState }): React.JSX.Element | null {
  const pulse = React.useRef(new Animated.Value(0)).current;
  const isWaiting = state.kind === 'waiting';

  React.useEffect(() => {
    if (!isWaiting) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isWaiting, pulse]);

  if (state.kind === 'idle') return null;

  if (state.kind === 'received') {
    return (
      <View className="mb-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 flex-row items-center">
        <Text className="text-base mr-2">✅</Text>
        <Text className="text-success text-xs flex-1">
          Customer shared their location — Step 1 auto-filled.
        </Text>
      </View>
    );
  }

  if (state.kind === 'expired') {
    return (
      <View className="mb-2 rounded-md border border-border bg-surfaceMuted px-3 py-2 flex-row items-center">
        <Text className="text-base mr-2">⌛</Text>
        <Text className="text-text-muted text-xs flex-1">
          Link expired before the customer responded. Generate a new one if needed.
        </Text>
      </View>
    );
  }

  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.3] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });

  return (
    <View className="mb-2 rounded-md border border-gold/40 bg-gold/5 px-3 py-2 flex-row items-center">
      <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
        <Animated.View
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: '#E30613',
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          }}
        />
        <Animated.View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#E30613',
            opacity: dotOpacity,
            transform: [{ scale: dotScale }],
          }}
        />
      </View>
      <Text className="text-gold text-xs flex-1">
        Waiting for the customer to share their location…
      </Text>
    </View>
  );
}

/* ------------------------------- Channel row ------------------------------- */

function ChannelRow(props: {
  icon: string;
  label: string;
  disabled: boolean;
  disabledReason: string;
  status: ChannelStatus;
  onPress: () => void;
}): React.JSX.Element {
  const { status } = props;
  const isBusy = status.kind === 'sending';
  const showAsDisabled = props.disabled || isBusy;

  const subline = props.disabled
    ? props.disabledReason
    : status.kind === 'sending'
      ? 'Sending…'
      : status.kind === 'sent'
        ? `Link sent · valid ${status.expiresInMinutes} min · tap to resend`
        : status.kind === 'opened'
          ? 'Opened WhatsApp · tap to send again'
          : status.kind === 'copied'
            ? `Shared · valid ${status.expiresInMinutes} min · tap to share again`
            : status.kind === 'error'
              ? `${status.message} · tap to retry`
              : 'Tap to send a secure link';

  const sublineColour =
    status.kind === 'sent' || status.kind === 'opened' || status.kind === 'copied'
      ? 'text-success'
      : status.kind === 'error'
        ? 'text-danger'
        : 'text-text-muted';

  return (
    <Pressable
      onPress={showAsDisabled ? undefined : props.onPress}
      disabled={showAsDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: showAsDisabled }}
      className={`min-h-[56px] rounded-lg border px-3 py-3 flex-row items-center gap-3 ${
        showAsDisabled ? 'border-border bg-surfaceMuted opacity-60' : 'border-gold/40 bg-surface'
      }`}
    >
      <Text className="text-lg">{props.icon}</Text>
      <View className="flex-1">
        <Text className="text-text text-sm font-semibold">{props.label}</Text>
        <Text className={`text-[11px] mt-0.5 ${sublineColour}`}>{subline}</Text>
      </View>
      {status.kind === 'sent' || status.kind === 'opened' || status.kind === 'copied' ? (
        <Text className="text-success text-xs font-bold">✓</Text>
      ) : status.kind === 'error' ? (
        <Text className="text-danger text-xs font-bold">!</Text>
      ) : null}
    </Pressable>
  );
}
