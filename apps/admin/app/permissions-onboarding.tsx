import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { AppShell } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { AdminButton } from '@/components/ui/AdminButton';
import { AdminIcon } from '@/components/ui/AdminIcon';
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
} from '@/lib/notifications/permissions';
import type { PermissionStatus } from '@/lib/notifications/types';
import { markPermissionsOnboardingSeen } from '@/lib/permissions/onboarding-flag';

type StepStatus = PermissionStatus | 'unsupported';

interface StepState {
  notifications: StepStatus;
  notificationsCanAskAgain: boolean;
  location: StepStatus;
  locationCanAskAgain: boolean;
  locationBackground: StepStatus;
  working: 'notifications' | 'location' | 'background' | null;
}

const INITIAL: StepState = {
  notifications: 'undetermined',
  notificationsCanAskAgain: true,
  location: 'undetermined',
  locationCanAskAgain: true,
  locationBackground: 'undetermined',
  working: null,
};

function statusBadge(status: StepStatus): { label: string; tone: 'good' | 'bad' | 'neutral' } {
  if (status === 'granted') return { label: 'Granted', tone: 'good' };
  if (status === 'denied') return { label: 'Denied', tone: 'bad' };
  if (status === 'unsupported') return { label: 'Not needed', tone: 'neutral' };
  return { label: 'Not asked', tone: 'neutral' };
}

function Badge({ status }: { status: StepStatus }): React.JSX.Element {
  const { label, tone } = statusBadge(status);
  const color = tone === 'good' ? '#22C55E' : tone === 'bad' ? '#EF4444' : '#9CA3AF';
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: `${color}22`,
        borderWidth: 1,
        borderColor: `${color}55`,
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label.toUpperCase()}</Text>
    </View>
  );
}

function StepCard({
  index,
  title,
  description,
  status,
  primaryLabel,
  onPrimary,
  loading,
  canOpenSettings,
  extra,
}: {
  index: number;
  title: string;
  description: string;
  status: StepStatus;
  primaryLabel: string;
  onPrimary: () => void | Promise<void>;
  loading: boolean;
  canOpenSettings: boolean;
  extra?: React.ReactNode;
}): React.JSX.Element {
  return (
    <GoldCard className="mb-3">
      <View className="flex-row items-start">
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#2A2A33',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Text style={{ color: '#D4AF37', fontWeight: '700' }}>{index}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-text font-semibold text-base flex-1 pr-2">{title}</Text>
            <Badge status={status} />
          </View>
          <Text className="text-text-muted text-sm mb-3">{description}</Text>
          {status !== 'granted' && status !== 'unsupported' ? (
            <GoldButton label={primaryLabel} onPress={onPrimary} loading={loading} />
          ) : null}
          {canOpenSettings ? (
            <View className="mt-2">
              <AdminButton
                label="Open settings"
                variant="secondary"
                size="sm"
                onPress={() => void Linking.openSettings()}
              />
            </View>
          ) : null}
          {extra ? <View className="mt-2">{extra}</View> : null}
        </View>
      </View>
    </GoldCard>
  );
}

export default function PermissionsOnboardingScreen(): React.JSX.Element {
  const [state, setState] = useState<StepState>(INITIAL);

  const refresh = useCallback(async (): Promise<void> => {
    const notif = await getNotificationPermissionStatus();
    let locStatus: StepStatus = 'undetermined';
    let locCanAsk = true;
    let bgStatus: StepStatus = Platform.OS === 'web' ? 'unsupported' : 'undetermined';
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      locStatus =
        fg.status === 'granted' ? 'granted' : fg.status === 'denied' ? 'denied' : 'undetermined';
      locCanAsk = fg.canAskAgain ?? true;
    } catch {
      locStatus = 'unsupported';
    }
    if (Platform.OS !== 'web') {
      try {
        const bg = await Location.getBackgroundPermissionsAsync();
        bgStatus =
          bg.status === 'granted'
            ? 'granted'
            : bg.status === 'denied'
              ? 'denied'
              : 'undetermined';
      } catch {
        bgStatus = 'unsupported';
      }
    }
    setState((s) => ({
      ...s,
      notifications: notif.status,
      notificationsCanAskAgain: notif.canAskAgain,
      location: locStatus,
      locationCanAskAgain: locCanAsk,
      locationBackground: bgStatus,
    }));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const askNotifications = useCallback(async (): Promise<void> => {
    setState((s) => ({ ...s, working: 'notifications' }));
    try {
      const next = await requestNotificationPermissions();
      setState((s) => ({
        ...s,
        notifications: next.status,
        notificationsCanAskAgain: next.canAskAgain,
      }));
    } finally {
      setState((s) => ({ ...s, working: null }));
    }
  }, []);

  const askLocation = useCallback(async (): Promise<void> => {
    setState((s) => ({ ...s, working: 'location' }));
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      setState((s) => ({
        ...s,
        location:
          fg.status === 'granted' ? 'granted' : fg.status === 'denied' ? 'denied' : 'undetermined',
        locationCanAskAgain: fg.canAskAgain ?? true,
      }));
    } catch {
      setState((s) => ({ ...s, location: 'unsupported' }));
    } finally {
      setState((s) => ({ ...s, working: null }));
    }
  }, []);

  const askBackgroundLocation = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    setState((s) => ({ ...s, working: 'background' }));
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      setState((s) => ({
        ...s,
        locationBackground:
          bg.status === 'granted' ? 'granted' : bg.status === 'denied' ? 'denied' : 'undetermined',
      }));
    } catch {
      setState((s) => ({ ...s, locationBackground: 'unsupported' }));
    } finally {
      setState((s) => ({ ...s, working: null }));
    }
  }, []);

  const finish = useCallback(async (): Promise<void> => {
    await markPermissionsOnboardingSeen();
    router.replace('/login');
  }, []);

  const skip = useCallback(async (): Promise<void> => {
    await markPermissionsOnboardingSeen();
    router.replace('/login');
  }, []);

  const [runningAll, setRunningAll] = useState(false);
  const runAll = useCallback(async (): Promise<void> => {
    setRunningAll(true);
    try {
      // Always re-read current status before each ask so we skip already granted ones
      // 1) Notifications
      const notifNow = await getNotificationPermissionStatus();
      if (notifNow.status !== 'granted' && notifNow.canAskAgain) {
        await askNotifications();
      }
      // 2) Foreground location
      try {
        const fgNow = await Location.getForegroundPermissionsAsync();
        if (fgNow.status !== 'granted' && (fgNow.canAskAgain ?? true)) {
          await askLocation();
        }
      } catch {
        /* ignore */
      }
      // 3) Background location (skip on web, only ask if foreground granted)
      if (Platform.OS !== 'web') {
        try {
          const fg2 = await Location.getForegroundPermissionsAsync();
          if (fg2.status === 'granted') {
            const bgNow = await Location.getBackgroundPermissionsAsync();
            if (bgNow.status !== 'granted' && (bgNow.canAskAgain ?? true)) {
              await askBackgroundLocation();
            }
          }
        } catch {
          /* ignore */
        }
      }
      await refresh();
    } finally {
      setRunningAll(false);
    }
  }, [askNotifications, askLocation, askBackgroundLocation, refresh]);

  const allCriticalDone =
    state.notifications === 'granted' &&
    (state.location === 'granted' || state.location === 'unsupported');

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={{ alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#1A1A22',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(212,175,55,0.4)',
              marginBottom: 12,
            }}
          >
            <AdminIcon name="bell" size={28} color="#D4AF37" />
          </View>
          <Text className="text-text text-2xl font-bold text-center">
            Set up TyreRepair Admin
          </Text>
          <Text className="text-text-muted text-sm text-center mt-1 px-4">
            Grant the permissions below so emergency calls, bookings and on-site arrivals reach you
            instantly — even when the app is closed.
          </Text>
        </View>

        <GoldCard className="mb-4">
          <Text className="text-text font-semibold text-base mb-1">One-tap setup</Text>
          <Text className="text-text-muted text-sm mb-3">
            Tap below and accept each system prompt. We'll only ask for what's still needed.
          </Text>
          <GoldButton
            label={runningAll ? 'Following prompts…' : allCriticalDone ? 'All set — review below' : 'Allow all'}
            onPress={runAll}
            loading={runningAll}
            disabled={allCriticalDone}
          />
        </GoldCard>

        <StepCard
          index={1}
          title="Push notifications"
          description="Required to receive booking, payment, stock and emergency-call alerts on this device."
          status={state.notifications}
          primaryLabel="Enable notifications"
          onPrimary={askNotifications}
          loading={state.working === 'notifications'}
          canOpenSettings={
            state.notifications === 'denied' && !state.notificationsCanAskAgain
          }
        />

        <StepCard
          index={2}
          title="Location while using the app"
          description="Lets the app show customer pins on the map and confirm your arrival at job sites."
          status={state.location}
          primaryLabel="Allow location"
          onPrimary={askLocation}
          loading={state.working === 'location'}
          canOpenSettings={state.location === 'denied' && !state.locationCanAskAgain}
        />

        {Platform.OS !== 'web' ? (
          <StepCard
            index={3}
            title="Background location (optional)"
            description="Enables arrival/leave alerts even when the app is in the background. You can change this later."
            status={state.locationBackground}
            primaryLabel="Allow background location"
            onPrimary={askBackgroundLocation}
            loading={state.working === 'background'}
            canOpenSettings={false}
          />
        ) : null}

        {Platform.OS === 'android' ? (
          <GoldCard className="mb-3">
            <View className="flex-row items-start">
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#2A2A33',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Text style={{ color: '#D4AF37', fontWeight: '700' }}>
                  {Platform.OS === 'web' ? 3 : 4}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold text-base mb-1">
                  Keep alerts reliable
                </Text>
                <Text className="text-text-muted text-sm mb-3">
                  For full-screen alerts when the phone is locked, please disable battery
                  restrictions for this app: Settings → Apps → TyreRepair Admin → Battery →
                  Unrestricted.
                </Text>
                <AdminButton
                  label="Open app settings"
                  variant="secondary"
                  size="sm"
                  onPress={() => void Linking.openSettings()}
                />
              </View>
            </View>
          </GoldCard>
        ) : null}

        <View style={{ marginTop: 8 }}>
          <GoldButton
            label={allCriticalDone ? 'Continue to sign in' : 'Continue anyway'}
            onPress={finish}
          />
          <Pressable
            onPress={skip}
            accessibilityRole="button"
            hitSlop={12}
            style={{ alignItems: 'center', paddingVertical: 12, marginTop: 4 }}
          >
            <Text className="text-text-muted text-sm">Skip for now</Text>
          </Pressable>
        </View>

        <Text className="text-text-dim text-[11px] text-center mt-2 px-6">
          You can re-run this setup any time from More → Diagnostics → Re-run permission setup.
        </Text>
      </ScrollView>
    </AppShell>
  );
}
