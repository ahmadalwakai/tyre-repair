import React, { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * Skeleton loader — pulsing placeholder block, matched to the dark theme.
 *
 * Use composition for richer skeletons:
 *
 *   <View>
 *     <Skeleton width="60%" height={14} />
 *     <Skeleton width="40%" height={12} className="mt-2" />
 *     <Skeleton height={48} className="mt-3 rounded-xl" />
 *   </View>
 *
 * Pulse is gentle (700 ms each direction) so it never distracts the
 * operator from real work appearing on screen.
 */
export interface SkeletonProps extends Omit<ViewProps, 'children'> {
  width?: number | `${number}%`;
  height?: number;
  rounded?: boolean;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 14,
  rounded = true,
  className,
  style,
  ...rest
}: SkeletonProps): React.JSX.Element {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const baseProps: Record<string, unknown> = { ...rest };
  if (className !== undefined) baseProps.className = className;

  return (
    <Animated.View
      {...baseProps}
      style={[
        {
          width,
          height,
          backgroundColor: '#2A2A33',
          borderRadius: rounded ? 6 : 0,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Common shape: a card-sized skeleton with a title + 2 lines + a button bar. */
export function SkeletonCard(): React.JSX.Element {
  return (
    <View
      className="bg-surface border border-border rounded-2xl p-4 mb-3"
      style={{ gap: 8 }}
    >
      <Skeleton width="55%" height={14} />
      <Skeleton width="80%" height={12} />
      <Skeleton width="40%" height={12} />
      <View style={{ height: 6 }} />
      <Skeleton height={44} rounded />
    </View>
  );
}

/** A list of {@link SkeletonCard}s — useful while loading list screens. */
export function SkeletonCardList({ count = 3 }: { count?: number }): React.JSX.Element {
  return (
    <View className="px-3 pt-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
