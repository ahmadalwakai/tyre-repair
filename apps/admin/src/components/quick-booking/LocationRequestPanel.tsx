/**
 * LocationRequestPanel — Step 1 of Quick Booking.
 *
 * Lets the admin send the customer a secure location-capture link by SMS,
 * email, or WhatsApp (external wa.me URL only). Never blocks booking on
 * failure; surfaces clear inline state and disables channels whose required
 * contact is missing.
 *
 * Backend: POST /api/admin/quick-booking/request-location.
 */
import * as React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { useToast } from '@/components/ui/Toast';
import {
  requestQuickBookingLocation,
  type LocationRequestChannel,
  type RequestLocationResponse,
} from '@/lib/api/quick-booking-helpers';

interface Props {
  /** Customer phone collected so far (may be empty). */
  customerPhone: string;
  /** Customer email collected so far (may be empty). */
  customerEmail: string;
  /** Optional name for personalisation in the email greeting. */
  customerName?: string;
}

type ChannelStatus =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; expiresInMinutes: number }
  | { kind: 'opened' }
  | { kind: 'error'; message: string };

const RESEND_DEBOUNCE_MS = 4000;

export function LocationRequestPanel({
  customerPhone,
  customerEmail,
  customerName,
}: Props): React.JSX.Element {
  const toast = useToast();
  const [smsStatus, setSmsStatus] = React.useState<ChannelStatus>({ kind: 'idle' });
  const [emailStatus, setEmailStatus] = React.useState<ChannelStatus>({ kind: 'idle' });
  const [whatsappStatus, setWhatsappStatus] = React.useState<ChannelStatus>({ kind: 'idle' });
  const lastTapRef = React.useRef<Record<LocationRequestChannel, number>>({
    SMS: 0,
    EMAIL: 0,
    WHATSAPP_LINK: 0,
  });

  const phoneOk = customerPhone.trim().length >= 7;
  const emailOk = /.+@.+\..+/.test(customerEmail.trim());

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
            : setWhatsappStatus;
      setStatus({ kind: 'sending' });

      try {
        const payload: Parameters<typeof requestQuickBookingLocation>[0] = { channel };
        if (channel === 'SMS' || channel === 'WHATSAPP_LINK') payload.phone = customerPhone.trim();
        if (channel === 'EMAIL') payload.email = customerEmail.trim();
        if (customerName && customerName.trim()) payload.customerName = customerName.trim();

        const res: RequestLocationResponse = await requestQuickBookingLocation(payload);

        if (channel === 'WHATSAPP_LINK') {
          if (res.externalUrl) {
            const opened = await Linking.canOpenURL(res.externalUrl);
            if (opened) {
              await Linking.openURL(res.externalUrl);
              setStatus({ kind: 'opened' });
              toast.show('Opened WhatsApp', 'success');
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
    [customerPhone, customerEmail, customerName, toast],
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

      <View className="gap-2">
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
          : status.kind === 'error'
            ? `${status.message} · tap to retry`
            : 'Tap to send a secure link';

  const sublineColour =
    status.kind === 'sent' || status.kind === 'opened'
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
      {status.kind === 'sent' || status.kind === 'opened' ? (
        <Text className="text-success text-xs font-bold">✓</Text>
      ) : status.kind === 'error' ? (
        <Text className="text-danger text-xs font-bold">!</Text>
      ) : null}
    </Pressable>
  );
}
