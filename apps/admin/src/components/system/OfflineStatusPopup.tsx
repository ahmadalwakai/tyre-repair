import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { playSound } from '@/lib/sound/play-sound';

type Mode = 'offline' | 'back-online' | null;

function SadFaceSvg({ size = 120 }: { size?: number }): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="56" fill="#FFD166" stroke="#D4A017" strokeWidth="3" />
      {/* eyes */}
      <Circle cx="42" cy="50" r="6" fill="#1A1A22" />
      <Circle cx="78" cy="50" r="6" fill="#1A1A22" />
      {/* sad mouth (frown) */}
      <Path
        d="M38 86 Q60 64 82 86"
        stroke="#1A1A22"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      {/* tear */}
      <Path d="M42 60 Q40 72 44 72 Q48 72 46 60 Z" fill="#5DB7E8" />
    </Svg>
  );
}

function HappyFaceSvg({ size = 120 }: { size?: number }): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="56" fill="#A7F3D0" stroke="#10B981" strokeWidth="3" />
      <Circle cx="42" cy="50" r="6" fill="#0F172A" />
      <Circle cx="78" cy="50" r="6" fill="#0F172A" />
      <Path
        d="M38 70 Q60 96 82 70"
        stroke="#0F172A"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * Centered popup with a sad/happy SVG face that appears on network
 * transitions. Plays the existing offline_drop / online_back sounds.
 */
export function OfflineStatusPopup(): React.JSX.Element | null {
  const { online } = useNetworkStatus();
  const [mode, setMode] = useState<Mode>(null);
  const prevOnlineRef = useRef<boolean | null>(null);
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Skip the very first render so we don't pop on cold start.
    if (prevOnlineRef.current === null) {
      prevOnlineRef.current = online;
      return;
    }
    if (prevOnlineRef.current === online) return;

    const next: Mode = online ? 'back-online' : 'offline';
    prevOnlineRef.current = online;
    setMode(next);
    void playSound(next === 'offline' ? 'offline_drop' : 'online_back', { volume: 0.7 });

    scale.setValue(0.6);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    // Online-back auto-hides quickly; offline stays until user taps or comes back.
    const hideAfter = next === 'back-online' ? 1800 : 4000;
    autoHideTimer.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMode(null);
      });
    }, hideAfter);

    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
  }, [online, scale, opacity]);

  const dismiss = (): void => {
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMode(null);
    });
  };

  if (!mode) return null;

  const isOffline = mode === 'offline';
  const title = isOffline ? 'You are offline' : "You're back online";
  const subtitle = isOffline
    ? 'Connection lost. We will keep retrying.'
    : 'Connection restored. Queued actions will sync.';

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss}>
      <Pressable
        onPress={dismiss}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Animated.View
          style={{
            opacity,
            transform: [{ scale }],
            backgroundColor: '#1A1A22',
            borderRadius: 24,
            paddingHorizontal: 28,
            paddingVertical: 32,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isOffline ? 'rgba(227,6,19,0.45)' : 'rgba(16,185,129,0.45)',
            minWidth: 280,
            maxWidth: 360,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          {isOffline ? <SadFaceSvg size={120} /> : <HappyFaceSvg size={120} />}
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: '700',
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: '#A1A1AA',
              fontSize: 14,
              marginTop: 6,
              textAlign: 'center',
            }}
          >
            {subtitle}
          </Text>
          <View
            style={{
              marginTop: 18,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Tap to dismiss</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
