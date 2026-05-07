import React, { useEffect, useRef } from 'react';
import { Animated as RNAnimated, Easing, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useNotifications } from '@/context/NotificationProvider';
import { router } from 'expo-router';

const ROUTE_BY_TARGET: Record<string, string> = {
  bookings: '/bookings',
  stock: '/stock',
  pricing: '/pricing',
  visitors: '/visitors',
  dashboard: '/dashboard',
};

/**
 * Floating in-app banner shown on top of the app shell when a push or pusher
 * admin event arrives in the foreground. Critical events (booking/payment/
 * low-stock) are sticky and require manual dismissal.
 *
 * Visual rhythm: a soft gold neon halo pulses around the card and the primary
 * Open button has a continuous gentle shimmer to draw attention without being
 * as aggressive as the incoming-call popup.
 */
export function InAppNotificationBanner(): React.JSX.Element | null {
  const { banner, dismissBanner } = useNotifications();
  const beat = useRef(new RNAnimated.Value(0)).current;
  const shimmer = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!banner) {
      beat.stopAnimation();
      shimmer.stopAnimation();
      beat.setValue(0);
      shimmer.setValue(0);
      return;
    }
    const beatLoop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(beat, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        RNAnimated.timing(beat, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    const shimmerLoop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(shimmer, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        RNAnimated.timing(shimmer, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    beatLoop.start();
    shimmerLoop.start();
    return (): void => {
      beatLoop.stop();
      shimmerLoop.stop();
    };
  }, [banner, beat, shimmer]);

  if (!banner) return null;

  const open = (): void => {
    const route = ROUTE_BY_TARGET[banner.screenTarget] ?? '/dashboard';
    try {
      router.push(route as Parameters<typeof router.push>[0]);
    } catch {
      // ignore
    }
    dismissBanner();
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={{
        position: 'absolute',
        top: 48,
        left: 12,
        right: 12,
        zIndex: 100,
      }}
    >
      <View style={{ position: 'relative' }}>
        {/* Outer pulsing neon halo */}
        <RNAnimated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -10,
            left: -10,
            right: -10,
            bottom: -10,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: '#D4AF37',
            opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.6] }),
            transform: [
              {
                scale: beat.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.99, 1.025],
                }),
              },
            ],
          }}
        />
        <RNAnimated.View
          style={{
            backgroundColor: '#15151B',
            borderColor: '#D4AF37',
            borderWidth: 1,
            borderRadius: 14,
            padding: 14,
            shadowColor: '#D4AF37',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] }),
            shadowRadius: beat.interpolate({ inputRange: [0, 1], outputRange: [8, 22] }),
            elevation: 10,
          }}
        >
          <Text style={{ color: '#D4AF37', fontWeight: '700', fontSize: 14 }}>{banner.title}</Text>
          <Text style={{ color: '#E5E5EC', fontSize: 13, marginTop: 4 }}>{banner.body}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ position: 'relative' }}>
              {/* Continuous neon ring around the Open CTA */}
              <RNAnimated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  right: -4,
                  bottom: -4,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: '#D4AF37',
                  opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.7] }),
                  transform: [
                    {
                      scale: shimmer.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1.06],
                      }),
                    },
                  ],
                }}
              />
              <RNAnimated.View
                style={{
                  borderRadius: 8,
                  shadowColor: '#D4AF37',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
                  shadowRadius: shimmer.interpolate({ inputRange: [0, 1], outputRange: [6, 16] }),
                  elevation: 8,
                }}
              >
                <Pressable
                  onPress={open}
                  style={{
                    backgroundColor: '#D4AF37',
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#0B0B0F', fontWeight: '700' }}>Open</Text>
                </Pressable>
              </RNAnimated.View>
            </View>
            <Pressable
              onPress={dismissBanner}
              style={{
                borderColor: '#3A3A45',
                borderWidth: 1,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#E5E5EC' }}>Dismiss</Text>
            </Pressable>
          </View>
        </RNAnimated.View>
      </View>
    </Animated.View>
  );
}
