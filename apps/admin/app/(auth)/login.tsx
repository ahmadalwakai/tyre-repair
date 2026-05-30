import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
  TSpan,
} from 'react-native-svg';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { router, Link } from 'expo-router';
import { GoldButton } from '@/components/ui/GoldButton';
import { useSession } from '@/components/auth/SessionProvider';
import { login } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { BrandLogo } from '@/components/branding/BrandLogo';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const loginSuccessSound = require('../../assets/sounds/login-success.mp3') as number;

const NEON = '#FF1A2C';
const NEON_DEEP = '#7A0410';
const SURFACE = '#08080B';

async function playLoginSuccessSound(): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(loginSuccessSound, {
      shouldPlay: true,
      volume: 1.0,
    });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    // best-effort
  }
}

const APP_VERSION =
  (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

function formatClock(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/* ----------------------------------------------------------------------- */
/* Decorative pieces                                                        */
/* ----------------------------------------------------------------------- */

function DotGrid({ width, height }: { width: number; height: number }): React.JSX.Element {
  const step = 28;
  const cols = Math.ceil(width / step);
  const rows = Math.ceil(height / step);
  const dots: React.JSX.Element[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <Circle
          key={`${r}-${c}`}
          cx={c * step}
          cy={r * step}
          r={0.7}
          fill="#FF1A2C"
          opacity={0.08}
        />,
      );
    }
  }
  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {dots}
    </Svg>
  );
}

function ScannerRing({ size, spin }: { size: number; spin: Animated.Value }): React.JSX.Element {
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: [{ rotate }],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="ring" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={NEON} stopOpacity="0" />
            <Stop offset="80%" stopColor={NEON} stopOpacity="0" />
            <Stop offset="100%" stopColor={NEON} stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke={NEON}
          strokeWidth={0.6}
          strokeDasharray="2 6"
          opacity={0.45}
        />
        <Path
          d="M50 4 A46 46 0 0 1 96 50"
          stroke={NEON}
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
          opacity={0.9}
        />
        <Path
          d="M50 4 A46 46 0 0 1 80 16"
          stroke="#FFFFFF"
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
          opacity={0.8}
        />
      </Svg>
    </Animated.View>
  );
}

/* ----------------------------------------------------------------------- */
/* Shimmer title                                                            */
/* ----------------------------------------------------------------------- */

const AnimatedStop = Animated.createAnimatedComponent(Stop);

function ShimmerTitle({
  white,
  red,
  fontSize,
  width,
}: {
  white: string;
  red: string;
  fontSize: number;
  width: number;
}): React.JSX.Element {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.delay(900),
        Animated.timing(t, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [t]);

  // Map t in [0,1] to a band moving from -0.2 -> 1.2 across the gradient.
  const head = t.interpolate({ inputRange: [0, 1], outputRange: [-0.2, 1.2] });
  const off0 = head.interpolate({
    inputRange: [-0.2, 1.2],
    outputRange: [-0.35, 1.05],
  });
  const off1 = head.interpolate({
    inputRange: [-0.2, 1.2],
    outputRange: [-0.2, 1.2],
  });
  const off2 = head.interpolate({
    inputRange: [-0.2, 1.2],
    outputRange: [-0.05, 1.35],
  });

  // react-native-svg's <Stop> expects 0..1 strings; Animated values are passed
  // through as numbers, which it accepts at runtime.
  const height = Math.round(fontSize * 1.4);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="whiteShimmer" x1="0" y1="0" x2="1" y2="0">
          <AnimatedStop offset={off0 as unknown as string} stopColor={white} stopOpacity="1" />
          <AnimatedStop offset={off1 as unknown as string} stopColor="#FFFFFF" stopOpacity="1" />
          <AnimatedStop offset={off2 as unknown as string} stopColor={white} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="redShimmer" x1="0" y1="0" x2="1" y2="0">
          <AnimatedStop offset={off0 as unknown as string} stopColor={red} stopOpacity="1" />
          <AnimatedStop offset={off1 as unknown as string} stopColor="#FFD0D4" stopOpacity="1" />
          <AnimatedStop offset={off2 as unknown as string} stopColor={red} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <SvgText
        x={width / 2}
        y={fontSize}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="800"
        letterSpacing={0.5}
        fill={red}
        opacity={0.35}
        stroke={red}
        strokeWidth={2}
      >
        <TSpan>TyreRepair </TSpan>
        <TSpan>UK</TSpan>
      </SvgText>
      <SvgText
        x={width / 2}
        y={fontSize}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="800"
        letterSpacing={0.5}
      >
        <TSpan fill="url(#whiteShimmer)">TyreRepair </TSpan>
        <TSpan fill="url(#redShimmer)">UK</TSpan>
      </SvgText>
    </Svg>
  );
}

function EyeIcon({ open, color }: { open: boolean; color: string }): React.JSX.Element {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <G stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <Circle cx={12} cy={12} r={3} />
        {!open ? <Line x1={4} y1={4} x2={20} y2={20} /> : null}
      </G>
    </Svg>
  );
}

/* ----------------------------------------------------------------------- */
/* Neon input                                                               */
/* ----------------------------------------------------------------------- */

interface NeonInputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoComplete?: 'email' | 'password';
  autoCapitalize?: 'none' | 'sentences';
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done' | 'go';
  rightSlot?: React.ReactNode;
  onCapsLockChange?: (on: boolean) => void;
}

function NeonInput(props: NeonInputProps): React.JSX.Element {
  const {
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType,
    autoComplete,
    autoCapitalize,
    onSubmitEditing,
    returnKeyType,
    rightSlot,
    onCapsLockChange,
  } = props;

  const [focused, setFocused] = useState(false);
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(glow, {
      toValue: focused ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focused, glow]);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.10)', 'rgba(255,26,44,0.85)'],
  });
  const shadowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.7],
  });

  // Caps Lock detection (web only). On native this is a no-op.
  const handleKeyPress = (e: unknown): void => {
    if (Platform.OS !== 'web' || !onCapsLockChange) return;
    const evt = e as { getModifierState?: (k: string) => boolean };
    if (typeof evt.getModifierState === 'function') {
      onCapsLockChange(evt.getModifierState('CapsLock') === true);
    }
  };

  return (
    <View style={{ width: '100%' }}>
      <Text
        style={{
          color: focused ? '#FFD0D4' : '#9CA3AF',
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <Animated.View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor,
          backgroundColor: 'rgba(12,12,16,0.9)',
          shadowColor: NEON,
          shadowOpacity,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          flexDirection: 'row',
          alignItems: 'center',
          paddingRight: rightSlot ? 8 : 0,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#52525B"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onCapsLockChange?.(false);
          }}
          onKeyPress={handleKeyPress}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          style={{
            flex: 1,
            color: '#FFFFFF',
            fontSize: 16,
            paddingHorizontal: 14,
            paddingVertical: Platform.OS === 'ios' ? 14 : 12,
          }}
        />
        {rightSlot}
      </Animated.View>
    </View>
  );
}

/* ----------------------------------------------------------------------- */
/* Screen                                                                   */
/* ----------------------------------------------------------------------- */

export default function LoginScreen(): React.JSX.Element {
  const { signIn } = useSession();
  const { width, height } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  // Animations
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(24)).current;
  const pulseA = useRef(new Animated.Value(0)).current;
  const pulseB = useRef(new Animated.Value(0)).current;
  const pulseC = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Entrance + loops
  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const startPulse = (val: Animated.Value, delay: number): void => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };
    startPulse(pulseA, 0);
    startPulse(pulseB, 800);
    startPulse(pulseC, 1600);

    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 7000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(1800),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [logoScale, cardOpacity, cardY, pulseA, pulseB, pulseC, spin, sweep]);

  const shakeError = (): void => {
    errorShake.setValue(0);
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0.6, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async (): Promise<void> => {
    if (loading) return;
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password to continue.');
      shakeError();
      return;
    }
    setLoading(true);
    try {
      const res = await login(email.trim().toLowerCase(), password);
      await signIn(res.token, res.admin);
      void playLoginSuccessSound();
      router.replace('/(tabs)/today');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "We couldn't sign you in. Please try again.");
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  const logoSize = Math.min(Math.round(width * 0.42), 200);
  const ringSize = logoSize + 56;
  const isCompact = height < 720;

  const ringStyle = (
    v: Animated.Value,
  ): {
    transform: { scale: Animated.AnimatedInterpolation<number> }[];
    opacity: Animated.AnimatedInterpolation<number>;
  } => ({
    transform: [
      {
        scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.85] }),
      },
    ],
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
  });

  const sweepX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 460],
  });

  const errorTranslate = errorShake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-8, 8],
  });

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE }}>
      {/* Dot grid background */}
      <DotGrid width={width} height={height} />

      {/* Vignette blobs */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -140,
          left: -90,
          width: 340,
          height: 340,
          borderRadius: 170,
          backgroundColor: NEON,
          opacity: 0.18,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -180,
          right: -110,
          width: 380,
          height: 380,
          borderRadius: 190,
          backgroundColor: NEON_DEEP,
          opacity: 0.25,
        }}
      />
      {/* Top neon hairline */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: NEON,
          opacity: 0.55,
          shadowColor: NEON,
          shadowOpacity: 1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 22,
            paddingTop: isCompact ? 28 : 52,
            paddingBottom: 28,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Status pill */}
          <View
            style={{
              alignSelf: 'center',
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(20,20,26,0.7)',
              borderColor: 'rgba(255,26,44,0.3)',
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              marginBottom: isCompact ? 14 : 22,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#22C55E',
                marginRight: 8,
                shadowColor: '#22C55E',
                shadowOpacity: 1,
                shadowRadius: 6,
              }}
            />
            <Text style={{ color: '#E5E7EB', fontSize: 11, letterSpacing: 1.4 }}>
              CONTROL ROOM · {formatClock(now)}
            </Text>
          </View>

          {/* Logo cluster */}
          <View style={{ alignItems: 'center', marginBottom: isCompact ? 16 : 26 }}>
            <Animated.View
              style={{
                width: ringSize,
                height: ringSize,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: logoScale }],
              }}
            >
              {/* Pulsing rings */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: ringSize,
                    height: ringSize,
                    borderRadius: ringSize / 2,
                    borderWidth: 1.5,
                    borderColor: NEON,
                  },
                  ringStyle(pulseA),
                ]}
              />
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: ringSize,
                    height: ringSize,
                    borderRadius: ringSize / 2,
                    borderWidth: 1.5,
                    borderColor: NEON,
                  },
                  ringStyle(pulseB),
                ]}
              />
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: ringSize,
                    height: ringSize,
                    borderRadius: ringSize / 2,
                    borderWidth: 1.5,
                    borderColor: NEON,
                  },
                  ringStyle(pulseC),
                ]}
              />

              {/* Static glow halo */}
              <View
                style={{
                  position: 'absolute',
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                  backgroundColor: NEON,
                  opacity: 0.1,
                }}
              />

              {/* Scanner ring */}
              <ScannerRing size={ringSize - 8} spin={spin} />

              {/* The mark */}
              <View
                style={{
                  shadowColor: NEON,
                  shadowOpacity: 0.65,
                  shadowRadius: 28,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                <BrandLogo size={logoSize} />
              </View>
            </Animated.View>

            <View style={{ marginTop: 20, width: Math.min(width - 44, 340) }}>
              <ShimmerTitle
                white="#FFFFFF"
                red={NEON}
                fontSize={30}
                width={Math.min(width - 44, 340)}
              />
            </View>
            <Text
              style={{
                color: '#9CA3AF',
                fontSize: 11,
                marginTop: 6,
                letterSpacing: 4,
              }}
            >
              ADMIN · 24/7 MOBILE TYRE HELP
            </Text>
          </View>

          {/* Greeting */}
          <View
            style={{
              alignSelf: 'center',
              alignItems: 'center',
              width: '100%',
              maxWidth: 440,
              paddingHorizontal: 4,
              marginBottom: 18,
            }}
          >
            <Text
              style={{
                color: '#F3F4F6',
                fontSize: 18,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              The garage is yours. Let&apos;s get you in.
            </Text>
            <Text
              style={{
                color: '#9CA3AF',
                fontSize: 13,
                lineHeight: 19,
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              This is a highly sensitive operational system powered by machine
              learning, intelligent automation, and very advanced algorithms. Work
              confidently, stay focused, and let the platform do the heavy
              lifting.
            </Text>
          </View>

          {/* Card */}
          <Animated.View
            style={{
              opacity: cardOpacity,
              transform: [{ translateY: cardY }],
              width: '100%',
              maxWidth: 440,
              alignSelf: 'center',
              backgroundColor: 'rgba(16,16,22,0.92)',
              borderRadius: 22,
              borderWidth: 1,
              borderColor: 'rgba(255,26,44,0.35)',
              padding: 22,
              shadowColor: NEON,
              shadowOpacity: 0.35,
              shadowRadius: 28,
              shadowOffset: { width: 0, height: 12 },
              elevation: 14,
              overflow: 'hidden',
            }}
          >
            {/* Sweeping neon beam */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -20,
                bottom: -20,
                width: 90,
                transform: [{ translateX: sweepX }, { rotate: '14deg' }],
                backgroundColor: NEON,
                opacity: 0.06,
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <View
                style={{
                  width: 6,
                  height: 22,
                  borderRadius: 3,
                  backgroundColor: NEON,
                  marginRight: 10,
                  shadowColor: NEON,
                  shadowOpacity: 0.9,
                  shadowRadius: 8,
                }}
              />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 17,
                  fontWeight: '700',
                  letterSpacing: 0.5,
                }}
              >
                Sign in to continue
              </Text>
            </View>

            <View style={{ gap: 14 }}>
              <NeonInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="admin@tyrerepair.uk"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                returnKeyType="next"
              />

              <NeonInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoComplete="password"
                autoCapitalize="none"
                returnKeyType="go"
                onSubmitEditing={() => void handleLogin()}
                onCapsLockChange={setCapsOn}
                rightSlot={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                    style={({ pressed }) => ({
                      padding: 8,
                      opacity: pressed ? 0.6 : 1,
                    })}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showPassword} color="#9CA3AF" />
                  </Pressable>
                }
              />

              {capsOn ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(234,179,8,0.10)',
                    borderColor: 'rgba(234,179,8,0.4)',
                    borderWidth: 1,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#FCD34D', fontSize: 12 }}>
                    Caps Lock is on
                  </Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Link href="/forgot-password" asChild>
                  <Pressable hitSlop={8}>
                    <Text style={{ color: NEON, fontSize: 13, fontWeight: '600' }}>
                      Forgot password?
                    </Text>
                  </Pressable>
                </Link>
              </View>

              {error ? (
                <Animated.View
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.12)',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(239,68,68,0.45)',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    transform: [{ translateX: errorTranslate }],
                  }}
                >
                  <Text style={{ color: '#FCA5A5', fontSize: 13 }}>{error}</Text>
                </Animated.View>
              ) : null}

              <GoldButton
                label={loading ? 'Signing in…' : 'Sign in'}
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
              />
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={{ alignItems: 'center', marginTop: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.85 }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#22C55E',
                  marginRight: 8,
                  shadowColor: '#22C55E',
                  shadowOpacity: 1,
                  shadowRadius: 5,
                }}
              />
              <Text style={{ color: '#9CA3AF', fontSize: 12, letterSpacing: 0.4 }}>
                Encrypted · Glasgow · Scotland-wide
              </Text>
            </View>
            <Text style={{ color: '#52525B', fontSize: 11, marginTop: 6 }}>
              Built for the night shift · v{APP_VERSION}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
