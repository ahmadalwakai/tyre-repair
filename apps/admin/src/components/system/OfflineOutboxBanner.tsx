import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { getOutboxItems } from '@/lib/offline/outbox';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Admin Stability & Field Operations Pack — Part 2
 * Slim banner showing pending outbox count. Navigates to /outbox on tap.
 *
 * Visible only when there is at least one pending safe action OR the device
 * is offline. Designed to sit under the existing OfflineBanner.
 */
export function OfflineOutboxBanner(): React.JSX.Element | null {
  const { online } = useNetworkStatus();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const tick = async (): Promise<void> => {
      const items = await getOutboxItems();
      if (mounted) setCount(items.length);
    };
    void tick();
    const t = setInterval(() => {
      void tick();
    }, 5000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  if (count === 0 && online) return null;

  const label =
    count === 0
      ? 'Offline — safe actions only'
      : `${count} pending action${count === 1 ? '' : 's'} — tap to review`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        try {
          router.push('/outbox');
        } catch {
          // ignore
        }
      }}
      className="bg-warning/15 border-b border-warning px-4 py-2"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-warning text-xs font-semibold flex-1">{label}</Text>
        <Text className="text-warning text-xs">›</Text>
      </View>
    </Pressable>
  );
}
