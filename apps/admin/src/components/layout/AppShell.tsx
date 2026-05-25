import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between px-4 pt-4 pb-3 bg-canvas border-b border-border">
      <View className="flex-1 pr-3">
        <Text
          className="text-text text-2xl font-bold"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="text-text-muted text-sm mt-1"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View className="shrink-0">{right}</View> : null}
    </View>
  );
}

export function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <SafeAreaView className="flex-1 bg-canvas">{children}</SafeAreaView>;
}
