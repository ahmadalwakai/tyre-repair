import React from 'react';
import type { ViewProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

/**
 * Lightweight entrance-animated container for action cards.
 *
 * Uses Reanimated's `FadeInDown` (already a project dependency) for a
 * subtle 8px translate-up + fade. No spring, no bounce — Android-friendly.
 *
 * Pass `disabled` to opt out (e.g. inside long virtualised lists where
 * animating every row would harm performance).
 */
export interface AnimatedCardProps extends ViewProps {
  delay?: number;
  duration?: number;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function AnimatedCard({
  delay = 0,
  duration = 220,
  disabled = false,
  children,
  ...rest
}: AnimatedCardProps): React.JSX.Element {
  if (disabled) {
    return <Animated.View {...rest}>{children}</Animated.View>;
  }
  return (
    <Animated.View
      entering={FadeInDown.duration(duration).delay(delay).springify().damping(18)}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
