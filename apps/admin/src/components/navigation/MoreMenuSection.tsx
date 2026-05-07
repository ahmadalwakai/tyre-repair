import React from 'react';
import { Text, View } from 'react-native';

export interface MoreMenuSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Grouped card container for menu rows. Provides the section heading
 * and a divided list surface that matches the gold/black aesthetic.
 */
export function MoreMenuSection({
  title,
  children,
}: MoreMenuSectionProps): React.JSX.Element {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View className="mb-5">
      <Text className="text-text-muted text-[11px] uppercase tracking-wider px-2 mb-2">
        {title}
      </Text>
      <View className="bg-surface border border-border rounded-xl overflow-hidden">
        {items.map((child, index) => (
          <View key={index}>
            {index > 0 ? <View className="h-px bg-border ml-4" /> : null}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}
