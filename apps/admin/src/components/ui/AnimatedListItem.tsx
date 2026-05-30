import React from 'react';
import type { ViewProps } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

/**
 * Wrap each row inside a `FlatList` / `FlashList` `renderItem` to get:
 *  - entrance fade-in from below (staggered by index)
 *  - smooth `LinearTransition` when rows are added / removed / reordered
 *  - exit fade-out on removal
 *
 * Pass `disabled` for long lists where animating every row would harm fps;
 * the wrapper renders a plain `Animated.View` with no transitions.
 */
export interface AnimatedListItemProps extends ViewProps {
  index?: number;
  /** Stagger ms per index (capped at 6 items). Default 30. */
  stagger?: number;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function AnimatedListItem({
  index = 0,
  stagger = 30,
  disabled = false,
  children,
  ...rest
}: AnimatedListItemProps): React.JSX.Element {
  if (disabled) {
    return <Animated.View {...rest}>{children}</Animated.View>;
  }
  const delay = Math.min(index, 6) * stagger;
  return (
    <Animated.View
      entering={FadeInDown.duration(220).delay(delay).springify().damping(18)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.springify().damping(20).stiffness(180)}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
