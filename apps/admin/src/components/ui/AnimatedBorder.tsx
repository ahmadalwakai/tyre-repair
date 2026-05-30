import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface Props extends ViewProps {
  /** Border radius matching the inner content (px). */
  radius?: number;
  /** Stroke width (px). */
  strokeWidth?: number;
  /** Colour of the travelling segment. */
  color?: string;
  /** Length of the bright segment (px). */
  segmentLength?: number;
  /** Time for one full loop around the border (ms). */
  durationMs?: number;
  children: React.ReactNode;
}

/**
 * Wraps children with an animated "running light" segment travelling around
 * the border. Used to draw the admin's eye to live/important content (maps,
 * incoming calls, alert cards).
 */
export function AnimatedBorder({
  radius = 12,
  strokeWidth = 2,
  color = '#F01825',
  segmentLength = 90,
  durationMs = 2200,
  children,
  style,
  ...rest
}: Props): React.JSX.Element {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.linear }),
      -1,
      false,
    );
  }, [durationMs, progress]);

  const userOnLayout = rest.onLayout;
  const onLayout = (e: LayoutChangeEvent): void => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize((prev) => (prev?.w === width && prev?.h === height ? prev : { w: width, h: height }));
    }
    userOnLayout?.(e);
  };

  // SVG perimeter (approx; rounded corners shrink it slightly but the eye
  // doesn't notice and the loop still completes cleanly).
  const perimeter = size ? 2 * (size.w + size.h) - 8 * radius + 2 * Math.PI * radius : 0;
  const gap = Math.max(perimeter - segmentLength, 0);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: -progress.value * perimeter,
  }));

  return (
    <View style={style} {...rest} onLayout={onLayout}>
      {children}
      {size ? (
        <Svg
          width={size.w}
          height={size.h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {/* Faint static rail so the segment never sits on empty pixels */}
          <Rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={size.w - strokeWidth}
            height={size.h - strokeWidth}
            rx={radius}
            ry={radius}
            stroke={color}
            strokeOpacity={0.18}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Bright travelling segment */}
          <AnimatedRect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={size.w - strokeWidth}
            height={size.h - strokeWidth}
            rx={radius}
            ry={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={`${segmentLength} ${gap}`}
            animatedProps={animatedProps}
          />
        </Svg>
      ) : null}
    </View>
  );
}
