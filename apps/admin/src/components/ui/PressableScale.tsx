import React, { useCallback } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  pressedScale?: number;
  className?: string;
  style?: PressableProps['style'];
  children?: React.ReactNode;
  /** Use spring (default) for cards; timing for tight UI controls. */
  motion?: 'spring' | 'timing';
}

/**
 * Drop-in `Pressable` replacement that adds a subtle press-in scale.
 * Defaults: 0.96 spring — sized for cards / list rows. Honours pointer
 * cancellation correctly (release outside still resets scale).
 */
export function PressableScale({
  pressedScale = 0.96,
  motion = 'spring',
  onPressIn,
  onPressOut,
  className,
  style,
  children,
  ...rest
}: PressableScaleProps): React.JSX.Element {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (e) => {
      scale.value =
        motion === 'spring'
          ? withSpring(pressedScale, { damping: 18, stiffness: 320, mass: 0.6 })
          : withTiming(pressedScale, { duration: 90, easing: Easing.out(Easing.quad) });
      onPressIn?.(e);
    },
    [scale, motion, pressedScale, onPressIn],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (e) => {
      scale.value =
        motion === 'spring'
          ? withSpring(1, { damping: 14, stiffness: 260, mass: 0.6 })
          : withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
      onPressOut?.(e);
    },
    [scale, motion, onPressOut],
  );

  return (
    <AnimatedPressable
      {...rest}
      {...(className !== undefined ? { className } : {})}
      style={[animatedStyle, style as object]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}
