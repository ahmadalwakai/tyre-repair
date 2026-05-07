import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { GoldCard } from '@/components/ui/GoldCard';
import type { NextBestAction } from '@/types/admin-efficiency';

/**
 * Admin Efficiency Pack F18 — Next best action card.
 *
 * Renders the single most important thing the admin should do right now.
 */
export function NextBestActionCard({
  action,
}: {
  action: NextBestAction | null | undefined;
}): React.JSX.Element | null {
  if (!action) return null;

  const onPress = (): void => {
    if (action.type === 'EMERGENCY_ASSIST_WITH_PHONE' && action.phone) {
      void Linking.openURL(`tel:${action.phone}`);
      return;
    }
    if (
      action.type === 'EMERGENCY_ASSIST_WITH_PHONE' ||
      action.type === 'EMERGENCY_ASSIST_NO_PHONE'
    ) {
      router.push('/(tabs)/action-queue' as never);
      return;
    }
    if (action.bookingId) {
      router.push({ pathname: '/bookings/[bookingId]', params: { bookingId: action.bookingId } });
      return;
    }
    if (action.callbackRequestId) {
      router.push('/(tabs)/callbacks');
      return;
    }
    if (action.actionTarget) {
      router.push(action.actionTarget as never);
    }
  };

  const isQuiet = action.type === 'no_action';
  const ctaLabel =
    action.type === 'EMERGENCY_ASSIST_WITH_PHONE' && action.phone
      ? `Call ${action.phone}`
      : action.type === 'EMERGENCY_ASSIST_WITH_PHONE' ||
          action.type === 'EMERGENCY_ASSIST_NO_PHONE'
        ? 'Open action queue'
        : 'Open';

  return (
    <GoldCard className="mb-3">
      <Text className="text-gold text-[10px] uppercase tracking-wide">Next best action</Text>
      <Text className="text-text font-semibold mt-1">{action.title}</Text>
      {action.detail ? (
        <Text className="text-text-muted text-xs mt-1">{action.detail}</Text>
      ) : null}
      {!isQuiet ? (
        <Pressable
          onPress={onPress}
          className="mt-3 rounded-xl bg-gold py-3 items-center"
          accessibilityRole="button"
        >
          <Text className="text-canvas font-semibold">{ctaLabel}</Text>
        </Pressable>
      ) : (
        <View className="mt-3 rounded-xl bg-surfaceMuted py-3 items-center">
          <Text className="text-text-muted text-xs">All clear right now.</Text>
        </View>
      )}
    </GoldCard>
  );
}
