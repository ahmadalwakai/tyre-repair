import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AdminIcon, type AdminIconName } from '@/components/ui/AdminIcon';

interface Tile {
  label: string;
  icon: AdminIconName;
  href: string;
  /** Reserve the bright gold tone for the most-used action. */
  highlight?: boolean;
}

const TILES: Tile[] = [
  { label: 'Quick booking', icon: 'bolt', href: '/quick-booking', highlight: true },
  { label: 'Action queue', icon: 'list', href: '/(tabs)/action-queue' },
  { label: 'Failed payments', icon: 'card', href: '/failed-payments' },
  { label: 'Outstanding', icon: 'pound', href: '/outstanding-balances' },
  { label: 'Callbacks', icon: 'phone', href: '/callbacks' },
  { label: 'Notifications', icon: 'bell', href: '/notifications' },
  { label: 'Stock', icon: 'tyre', href: '/stock' },
  { label: 'Search', icon: 'search', href: '/search' },
];

/**
 * 4×2 shortcut grid for the Today screen.
 *
 * Visual recipe:
 *  - Square card with subtle gold-tinted border and dark surface.
 *  - 44px icon chip on top — bright gold for the highlight tile, muted gold
 *    on a 10%-opacity gold wash for the rest. Keeps "one primary action".
 *  - Two-line label cap, 10px, centred.
 *  - Android ripple stays inside the card.
 */
export function ShortcutTiles(): React.JSX.Element {
  return (
    <View className="mb-3">
      <Text className="text-text-dim text-[11px] uppercase tracking-wide mb-2">
        Shortcuts
      </Text>
      <View className="flex-row flex-wrap -mx-1">
        {TILES.map((t) => {
          const chipBg = t.highlight ? 'bg-gold' : 'bg-gold/10';
          const chipBorder = t.highlight ? 'border-gold' : 'border-gold/30';
          const iconColor = t.highlight ? '#0B0B0F' : '#D4AF37';
          const cardBorder = t.highlight ? 'border-gold/60' : 'border-border';
          return (
            <View key={t.href} className="w-1/4 px-1 mb-2">
              <Pressable
                onPress={() => router.push(t.href as never)}
                android_ripple={{
                  color: 'rgba(212,175,55,0.18)',
                  foreground: true,
                }}
                accessibilityRole="button"
                accessibilityLabel={t.label}
                className={`bg-surface border rounded-xl py-3 px-1 items-center ${cardBorder}`}
              >
                <View
                  className={`w-11 h-11 rounded-full items-center justify-center mb-1.5 border ${chipBg} ${chipBorder}`}
                >
                  <AdminIcon name={t.icon} size={22} color={iconColor} />
                </View>
                <Text
                  className="text-text text-[10px] text-center leading-tight"
                  numberOfLines={2}
                >
                  {t.label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
