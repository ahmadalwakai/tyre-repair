import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { playSound, type SoundKey } from '@/lib/sound/play-sound';
import { ConfettiBurst, type ConfettiBurstHandle } from '@/components/ui/ConfettiBurst';

/**
 * Lightweight in-app toast.
 *
 * Designed for the operator to glance and continue working — no modal,
 * no blocking. Shown above the bottom tab bar. Tap to dismiss.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('SMS sent to 07700 900 000');
 *   toast.error('Could not cancel — try again');
 *
 * Only one toast is visible at a time; a new call replaces the previous
 * toast immediately (no queue) so operators never wait for old messages.
 */
export type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone, durationMs?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  /** Success toast + confetti burst. Use sparingly for genuine wins. */
  celebrate: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: 'bg-success/20', border: 'border-success', text: 'text-success', icon: '✓' },
  error: { bg: 'bg-danger/25', border: 'border-danger', text: 'text-danger', icon: '⚠' },
  info: { bg: 'bg-gold/15', border: 'border-gold', text: 'text-gold', icon: 'ℹ' },
  warning: { bg: 'bg-warning/20', border: 'border-warning', text: 'text-warning', icon: '!' },
};

const TONE_SOUND: Record<ToastTone, SoundKey> = {
  success: 'toast_success',
  error: 'toast_error',
  info: 'toast_info',
  warning: 'toast_warning',
};

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counterRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiRef = useRef<ConfettiBurstHandle>(null);
  const insets = useSafeAreaInsets();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const dismiss = useCallback(() => {
    opacity.value = withTiming(0, { duration: 160 });
    translateY.value = withTiming(30, { duration: 160 }, (finished) => {
      if (finished) runOnJS(clearToast)();
    });
  }, [clearToast, opacity, translateY]);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info', durationMs = 3200) => {
      counterRef.current += 1;
      setToast({ id: counterRef.current, message, tone });
      opacity.value = withTiming(1, { duration: 180 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      void playSound(TONE_SOUND[tone], { volume: 0.5 });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        dismiss();
      }, durationMs);
    },
    [dismiss, opacity, translateY],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (m: string) => show(m, 'success'),
      error: (m: string) => show(m, 'error', 4500),
      info: (m: string) => show(m, 'info'),
      warning: (m: string) => show(m, 'warning', 4000),
      celebrate: (m: string) => {
        show(m, 'success');
        confettiRef.current?.fire();
      },
    }),
    [show],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const tone = toast ? TONE_STYLES[toast.tone] : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ConfettiBurst ref={confettiRef} />
      {toast && tone ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 80 + Math.max(insets.bottom, 0),
          }}
        >
          <Animated.View style={animatedStyle}>
            <Pressable onPress={dismiss}>
              <View
                className={`rounded-xl px-4 py-3 border flex-row items-center gap-3 ${tone.bg} ${tone.border}`}
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 10,
                }}
              >
                <Text className={`text-base font-bold ${tone.text}`}>{tone.icon}</Text>
                <Text className="text-text flex-1 text-sm" numberOfLines={3}>
                  {toast.message}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
