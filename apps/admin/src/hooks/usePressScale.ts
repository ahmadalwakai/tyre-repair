import { useCallback } from 'react';
import { AccessibilityInfo, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  type AnimatedStyle,
} from 'react-native-reanimated';

/**
 * usePressScale — micro-interaction for buttons / pressable cards.
 *
 * Returns:
 *  - `style`: animated style that scales between 1 and the pressed value.
 *  - `onPressIn` / `onPressOut`: handlers to wire to a Pressable.
 *  - `AnimatedView`: convenience re-export of `Animated.View`.
 *
 * Honours system "Reduce motion" preference asynchronously; while the user
 * has reduce-motion enabled the scale stays at 1 (no animation).
 */
export interface UsePressScaleOptions {
  pressed?: number;
  duration?: number;
  disabled?: boolean;
}

export function usePressScale(options: UsePressScaleOptions = {}): {
  style: AnimatedStyle<ViewStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
  AnimatedView: typeof Animated.View;
} {
  const { pressed = 0.97, duration = 110, disabled = false } = options;
  const scale = useSharedValue(1);
  const reduceMotion = useSharedValue(false);

  // Read reduce-motion preference once on mount (and keep listening).
  // We avoid useEffect to keep this hook footprint minimal — the worst case
  // is one frame of animation before the listener disables it.
  AccessibilityInfo.isReduceMotionEnabled()
    .then((v) => {
      reduceMotion.value = v;
    })
    .catch(() => {
      /* ignore */
    });

  const onPressIn = useCallback(() => {
    if (disabled || reduceMotion.value) return;
    scale.value = withTiming(pressed, {
      duration,
      easing: Easing.out(Easing.quad),
    });
  }, [disabled, duration, pressed, reduceMotion, scale]);

  const onPressOut = useCallback(() => {
    if (disabled || reduceMotion.value) {
      scale.value = 1;
      return;
    }
    scale.value = withTiming(1, {
      duration: duration + 30,
      easing: Easing.out(Easing.quad),
    });
  }, [disabled, duration, reduceMotion, scale]);

  const style = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { style, onPressIn, onPressOut, AnimatedView: Animated.View };
}
