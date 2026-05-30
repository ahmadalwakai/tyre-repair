import React, { useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';

export interface MoreMenuItemProps {
  label: string;
  description?: string;
  badge?: string | number | null;
  href: string;
}

function ChevronRight({ color }: { color: string }): React.JSX.Element {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase() || '·';
}

export function MoreMenuItem({
  label,
  description,
  badge,
  href,
}: MoreMenuItemProps): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;
  const chevX = useRef(new Animated.Value(0)).current;

  const onPressIn = (): void => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.98,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(chevX, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onPressOut = (): void => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 140,
        useNativeDriver: true,
      }),
      Animated.timing(chevX, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const chevTranslate = chevX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => router.push(href as never)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        android_ripple={{ color: 'rgba(255,26,44,0.10)' }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#15151B',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: pressed ? 'rgba(255,26,44,0.45)' : '#2A2A33',
          paddingVertical: 14,
          paddingHorizontal: 14,
          minHeight: 64,
        })}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            backgroundColor: 'rgba(255,26,44,0.10)',
            borderWidth: 1,
            borderColor: 'rgba(255,26,44,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Text
            style={{
              color: '#FF1A2C',
              fontSize: 12,
              fontWeight: '800',
              letterSpacing: 0.4,
            }}
          >
            {initials(label)}
          </Text>
        </View>

        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                color: '#F5F5F7',
                fontSize: 15.5,
                fontWeight: '700',
                letterSpacing: 0.1,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
            {badge !== undefined && badge !== null && badge !== '' ? (
              <View
                style={{
                  marginLeft: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,26,44,0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,26,44,0.45)',
                }}
              >
                <Text style={{ color: '#FF1A2C', fontSize: 10.5, fontWeight: '700' }}>
                  {String(badge)}
                </Text>
              </View>
            ) : null}
          </View>
          {description ? (
            <Text
              style={{
                color: '#8E8E96',
                fontSize: 12.5,
                marginTop: 3,
                lineHeight: 17,
              }}
              numberOfLines={2}
            >
              {description}
            </Text>
          ) : null}
        </View>

        <Animated.View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: '#2A2A33',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateX: chevTranslate }],
          }}
        >
          <ChevronRight color="#A0A0A8" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
