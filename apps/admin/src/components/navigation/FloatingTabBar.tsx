import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACTIVE = '#FF1A2C';
const INACTIVE = '#8E8E96';
const DOCK_BG = 'rgba(20,20,26,0.96)';
const DOCK_BORDER = 'rgba(255,26,44,0.22)';

type IconName = 'today' | 'actions' | 'bookings' | 'finance' | 'more';

const ROUTE_ICON: Record<string, IconName> = {
  today: 'today',
  'action-queue': 'actions',
  bookings: 'bookings',
  finance: 'finance',
  more: 'more',
};

function TabIcon({
  name,
  color,
  size = 22,
}: {
  name: IconName;
  color: string;
  size?: number;
}): React.JSX.Element {
  const stroke = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
  switch (name) {
    case 'today':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} {...stroke} />
          <Path d="M12 7v5l3 2" {...stroke} />
        </Svg>
      );
    case 'actions':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" {...stroke} />
        </Svg>
      );
    case 'bookings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3.5} y={5} width={17} height={15} rx={2.5} {...stroke} />
          <Path d="M3.5 10h17" {...stroke} />
          <Path d="M8 3v4" {...stroke} />
          <Path d="M16 3v4" {...stroke} />
        </Svg>
      );
    case 'finance':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M16.5 6.5a4 4 0 0 0-7 2.5v3.5H7" {...stroke} />
          <Path d="M7 18h10" {...stroke} />
          <Path d="M9.5 12.5h6" {...stroke} />
          <Path d="M9.5 9v6.5c0 1-.5 1.8-1.5 2.5" {...stroke} />
        </Svg>
      );
    case 'more':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={5.5} cy={12} r={1.6} fill={color} />
          <Circle cx={12} cy={12} r={1.6} fill={color} />
          <Circle cx={18.5} cy={12} r={1.6} fill={color} />
        </Svg>
      );
  }
}

interface TabItemProps {
  label: string;
  icon: IconName;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function TabItem({ label, icon, focused, onPress, onLongPress }: TabItemProps): React.JSX.Element {
  const scale = useRef(new Animated.Value(focused ? 1.05 : 1)).current;
  const indicator = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.05 : 1,
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    }).start();
    Animated.timing(indicator, {
      toValue: focused ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused, scale, indicator]);

  const combined = Animated.multiply(
    scale,
    press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }),
  );

  const pillOpacity = indicator;
  const pillScale = indicator.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() =>
        Animated.timing(press, {
          toValue: 1,
          duration: 90,
          useNativeDriver: true,
        }).start()
      }
      onPressOut={() =>
        Animated.timing(press, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }).start()
      }
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: combined }],
        }}
      >
        <View
          style={{
            width: 44,
            height: 30,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 44,
              height: 28,
              borderRadius: 14,
              backgroundColor: 'rgba(255,26,44,0.14)',
              borderWidth: 1,
              borderColor: 'rgba(255,26,44,0.35)',
              opacity: pillOpacity,
              transform: [{ scale: pillScale }],
            }}
          />
          <TabIcon name={icon} color={focused ? ACTIVE : INACTIVE} />
        </View>
        <Text
          numberOfLines={1}
          style={{
            marginTop: 2,
            fontSize: 10.5,
            fontWeight: focused ? '700' : '500',
            letterSpacing: 0.2,
            color: focused ? ACTIVE : INACTIVE,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export const FLOATING_TAB_BAR_HEIGHT = 64;
export const FLOATING_TAB_BAR_MARGIN = 14;

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const bottomGap = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: FLOATING_TAB_BAR_MARGIN,
        paddingBottom: bottomGap,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: DOCK_BG,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: DOCK_BORDER,
          paddingHorizontal: 6,
          paddingVertical: 6,
          height: FLOATING_TAB_BAR_HEIGHT,
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 16,
        }}
      >
        {state.routes.map((route, index) => {
          const icon = ROUTE_ICON[route.name];
          if (!icon) return null;
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;
          const { options } = descriptor;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const focused = state.index === index;

          const onPress = (): void => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          const onLongPress = (): void => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabItem
              key={route.key}
              label={label}
              icon={icon}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}
