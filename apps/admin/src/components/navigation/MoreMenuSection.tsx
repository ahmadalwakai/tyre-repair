import React from 'react';
import { Text, View } from 'react-native';

export interface MoreMenuSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Grouped container for premium menu cards. Each child is rendered as a
 * standalone card with a small vertical gap between them.
 */
export function MoreMenuSection({
  title,
  children,
}: MoreMenuSectionProps): React.JSX.Element {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ marginBottom: 22 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 4,
          marginBottom: 10,
        }}
      >
        <View
          style={{
            width: 3,
            height: 14,
            borderRadius: 2,
            backgroundColor: '#FF1A2C',
            marginRight: 8,
          }}
        />
        <Text
          style={{
            color: '#A0A0A8',
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        {items.map((child, index) => (
          <View key={index}>{child}</View>
        ))}
      </View>
    </View>
  );
}

