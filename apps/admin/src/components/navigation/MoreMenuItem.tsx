import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

export interface MoreMenuItemProps {
  label: string;
  description?: string;
  badge?: string | number | null;
  href: string;
}

/**
 * Tappable row used inside the More menu. Minimum 44px touch target,
 * gold accent on the chevron, and full-width hit area.
 */
export function MoreMenuItem({
  label,
  description,
  badge,
  href,
}: MoreMenuItemProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(href as never)}
      android_ripple={{ color: '#2A2A33' }}
      className="flex-row items-center px-4"
      style={{ minHeight: 56 }}
    >
      <View className="flex-1 py-3 pr-3">
        <View className="flex-row items-center">
          <Text className="text-text font-semibold text-base">{label}</Text>
          {badge !== undefined && badge !== null && badge !== '' ? (
            <View className="ml-2 px-2 py-0.5 rounded-full bg-gold/20 border border-gold/40">
              <Text className="text-gold text-[11px] font-semibold">{String(badge)}</Text>
            </View>
          ) : null}
        </View>
        {description ? (
          <Text className="text-text-muted text-xs mt-0.5">{description}</Text>
        ) : null}
      </View>
      <Text className="text-gold text-lg" accessibilityElementsHidden>
        ›
      </Text>
    </Pressable>
  );
}
