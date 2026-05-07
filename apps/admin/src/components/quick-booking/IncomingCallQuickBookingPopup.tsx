import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useNotifications } from '@/context/NotificationProvider';
import { acknowledgeCallClick } from '@/lib/api/call-click-events';
import { AdminButton } from '@/components/ui/AdminButton';
import { colors } from '@/theme/colors';

const PROBLEM_LABELS: Record<string, string> = {
  PUNCTURE_OR_FLAT: 'Puncture / flat',
  DAMAGED_OR_BLOWN_OUT: 'Damaged / blown out',
  SLOW_PRESSURE_LOSS: 'Slow pressure loss',
  NEEDS_REPLACEMENT: 'Needs replacement',
  NOT_SURE: 'Not sure',
};

/**
 * IncomingCallQuickBookingPopup
 *
 * Sticky modal that appears whenever a customer taps a tel: link on the public
 * site. It surfaces any partial form context they had filled in (phone, name,
 * job type, problem type) so the admin can either:
 *   - tap "Start Quick Booking" to open the Quick Booking screen prefilled, or
 *   - dismiss the popup if the customer never connected.
 *
 * The popup is sticky on purpose. Per business rules, missed call signals must
 * never silently disappear; they must be acknowledged by the admin.
 */
export function IncomingCallQuickBookingPopup(): React.JSX.Element | null {
  const { incomingCall, dismissIncomingCall } = useNotifications();
  const [busy, setBusy] = useState(false);
  const handledRef = useRef<string | null>(null);

  // Two-beat pulse to match the alert ringtone rhythm (~600ms per beat).
  const beat = useRef(new Animated.Value(0)).current;
  // Continuous slow shimmer for the Start Quick Booking button.
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!incomingCall) {
      beat.stopAnimation();
      shimmer.stopAnimation();
      beat.setValue(0);
      shimmer.setValue(0);
      return;
    }
    const beatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(beat, {
          toValue: 0,
          duration: 320,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    beatLoop.start();
    shimmerLoop.start();
    return (): void => {
      beatLoop.stop();
      shimmerLoop.stop();
    };
  }, [incomingCall, beat, shimmer]);

  const hasInfo = useMemo(() => Boolean(incomingCall), [incomingCall]);
  if (!incomingCall || !hasInfo) return null;

  function fireAck(action: 'DISMISSED' | 'STARTED_QUICK_BOOKING'): void {
    if (!incomingCall) return;
    const id = incomingCall.callClickEventId;
    if (!id || handledRef.current === id) return;
    handledRef.current = id;
    void acknowledgeCallClick(id, action).catch(() => {
      // Acknowledge is best-effort; never block UI.
    });
  }

  function startQuickBooking(): void {
    if (!incomingCall || busy) return;
    setBusy(true);
    fireAck('STARTED_QUICK_BOOKING');
    const params = new URLSearchParams();
    if (incomingCall.phone) params.set('phone', incomingCall.phone);
    if (incomingCall.customerName) params.set('customerName', incomingCall.customerName);
    if (incomingCall.tyreProblemType) params.set('tyreProblemType', incomingCall.tyreProblemType);
    if (incomingCall.jobType) params.set('jobType', incomingCall.jobType);
    if (incomingCall.sourcePage) params.set('prefillSource', incomingCall.sourcePage);
    if (incomingCall.callClickEventId) params.set('callClickEventId', incomingCall.callClickEventId);
    const qs = params.toString();
    dismissIncomingCall();
    router.push(qs ? `/quick-booking?${qs}` : '/quick-booking');
  }

  function handleDismiss(): void {
    if (busy) return;
    setBusy(true);
    fireAck('DISMISSED');
    dismissIncomingCall();
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={handleDismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
          {/* Outer neon halo — pulses with the ringtone beat */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -18,
              left: -18,
              right: -18,
              bottom: -18,
              borderRadius: 22,
              borderWidth: 2,
              borderColor: colors.goldBright,
              opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.75] }),
              transform: [
                {
                  scale: beat.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.985, 1.04],
                  }),
                },
              ],
            }}
          />
          {/* Inner neon halo — tighter pulse for a layered glow */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -6,
              left: -6,
              right: -6,
              bottom: -6,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.goldSoft,
              opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.95] }),
            }}
          />
          <Animated.View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.goldBright,
              borderWidth: 1,
              borderRadius: 12,
              padding: 20,
              borderStyle: 'solid',
              shadowColor: colors.goldBright,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
              shadowRadius: beat.interpolate({ inputRange: [0, 1], outputRange: [10, 28] }),
              elevation: 12,
            }}
          >
          <Text
            style={{
              color: colors.goldBright,
              fontSize: 18,
              fontWeight: '700',
              marginBottom: 4,
            }}
          >
            📞 Incoming website call
          </Text>
          <Text style={{ color: colors.textFaint, fontSize: 11, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Urgent · pickup the line
          </Text>
          <Text style={{ color: colors.textLight, fontSize: 14, marginBottom: 12 }}>
            A customer just tapped your phone number on the website. They may be
            on the line right now.
          </Text>

          <View style={{ marginBottom: 16, gap: 6 }}>
            <Row label="Phone" value={incomingCall.phone ?? '—'} highlight />
            <Row label="Name" value={incomingCall.customerName ?? '—'} />
            <Row
              label="Problem"
              value={
                incomingCall.tyreProblemType
                  ? (PROBLEM_LABELS[incomingCall.tyreProblemType] ?? incomingCall.tyreProblemType)
                  : '—'
              }
            />
            <Row label="Job type" value={incomingCall.jobType ?? '—'} />
            <Row label="From page" value={incomingCall.sourcePage ?? incomingCall.sourceComponent ?? '—'} />
          </View>

          <View style={{ position: 'relative', marginBottom: 10 }}>
            {/* Continuous neon halo behind the primary CTA */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -6,
                left: -6,
                right: -6,
                bottom: -6,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: colors.goldBright,
                opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.8] }),
                transform: [
                  {
                    scale: shimmer.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1.05],
                    }),
                  },
                ],
              }}
            />
            <AdminButton
              label="Start Quick Booking"
              loadingLabel="Opening…"
              loading={busy}
              variant="primary"
              size="lg"
              fullWidth
              onPress={startQuickBooking}
            />
          </View>
          <AdminButton
            label="Dismiss"
            variant="ghost"
            size="md"
            fullWidth
            disabled={busy}
            onPress={handleDismiss}
          />
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
