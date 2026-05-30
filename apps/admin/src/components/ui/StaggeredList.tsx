import React from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

/**
 * StaggeredList \u2014 wraps each child in a FadeInDown so list rows enter
 * with a tasteful sequential stagger.
 *
 *   <StaggeredList>
 *     {rows.map((r) => <RowCard key={r.id} {...r} />)}
 *   </StaggeredList>
 *
 * Skip the stagger inside virtualised lists (FlatList) where you only
 * see a few rows at a time \u2014 use `<AnimatedCard delay={index*60}>`
 * per row instead so newly rendered rows don't all re-animate together.
 */
export interface StaggeredListProps extends ViewProps {
  /** Per-item delay (ms). Default 60. */
  stagger?: number;
  /** Initial delay before the first child (ms). */
  delay?: number;
  /** Per-item animation duration (ms). */
  duration?: number;
  /** Disable animation (e.g. on slow Android devices). */
  disabled?: boolean;
  children?: React.ReactNode;
}

export function StaggeredList({
  stagger = 60,
  delay = 0,
  duration = 240,
  disabled = false,
  children,
  ...rest
}: StaggeredListProps): React.JSX.Element {
  if (disabled) {
    return <View {...rest}>{children}</View>;
  }
  const items = React.Children.toArray(children);
  return (
    <View {...rest}>
      {items.map((child, i) => (
        <Animated.View
          key={(child as { key?: React.Key })?.key ?? i}
          entering={FadeInDown.duration(duration)
            .delay(delay + i * stagger)
            .springify()
            .damping(18)}
        >
          {child}
        </Animated.View>
      ))}
    </View>
  );
}
