import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useOtaUpdates } from '@/hooks/useOtaUpdates';

/**
 * Small slide-down banner that appears when an OTA update has finished
 * downloading and is ready to install. Tap to reload the app into the new
 * bundle. Renders nothing in any other state (and nothing in dev).
 *
 * Mount once in the root layout above the navigator.
 */
export function OtaUpdateBanner(): React.JSX.Element | null {
  const { status, reload } = useOtaUpdates();
  if (status !== 'ready-to-reload') return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }}
    >
      <Pressable
        onPress={() => void reload()}
        accessibilityRole="button"
        accessibilityLabel="Install update and restart"
        style={{
          marginHorizontal: 12,
          marginTop: 8,
          backgroundColor: '#1A1A22',
          borderColor: '#D4AF37',
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text className="text-gold font-semibold">Update ready</Text>
          <Text className="text-text-muted text-xs mt-0.5">
            Tap to install and restart the app.
          </Text>
        </View>
        <Text className="text-gold font-semibold">Install ▸</Text>
      </Pressable>
    </View>
  );
}
