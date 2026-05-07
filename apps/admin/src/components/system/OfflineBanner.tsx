import React from 'react';
import { Text, View } from 'react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Item 10 — Offline banner.
 * Renders only when the device cannot reach the admin API. Sticky at top
 * of every screen (place inside `AppShell` or root layout).
 */
export function OfflineBanner(): React.JSX.Element | null {
  const { online } = useNetworkStatus();
  if (online) return null;
  return (
    <View className="bg-danger px-4 py-2">
      <Text className="text-text font-semibold text-center">
        Offline — sensitive actions are disabled until the connection returns.
      </Text>
    </View>
  );
}
