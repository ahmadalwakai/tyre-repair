/**
 * RadarPulse — two concentric expanding/fading rings + a solid core dot.
 *
 * Used as an overlay on top of static map snapshots to give a "live signal"
 * feel. Same animation as the customer-facing location-capture page.
 */
import * as React from 'react';
import { Animated, Easing, View } from 'react-native';

interface Props {
  /** X position in pixels OR a CSS-style percentage string like '50%'. */
  x: number | string;
  /** Y position in pixels OR a CSS-style percentage string like '50%'. */
  y: number | string;
  /** Ring + core colour (any valid CSS colour). */
  color: string;
  /** Initial delay before the first ring starts (ms). */
  delayMs?: number;
  /** Diameter of the resting ring (px). Rings scale 0.4x → 2.4x. Default 36. */
  size?: number;
}

export function RadarPulse({
  x,
  y,
  color,
  delayMs = 0,
  size = 36,
}: Props): React.JSX.Element {
  const a = React.useRef(new Animated.Value(0)).current;
  const b = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const makeLoop = (val: Animated.Value, initialDelay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(initialDelay),
          Animated.timing(val, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: false }),
        ]),
      );
    const loopA = makeLoop(a, delayMs);
    const loopB = makeLoop(b, delayMs + 800);
    loopA.start();
    loopB.start();
    return () => {
      loopA.stop();
      loopB.stop();
    };
  }, [a, b, delayMs]);

  const half = size / 2;
  const coreSize = Math.max(6, Math.round(size * 0.28));
  const coreHalf = coreSize / 2;

  const ringStyle = (val: Animated.Value) =>
    ({
      position: 'absolute',
      left: -half,
      top: -half,
      width: size,
      height: size,
      borderRadius: half,
      borderWidth: 2,
      borderColor: color,
      transform: [
        { scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.4] }) },
      ],
      opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
    }) as const;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: x as number, top: y as number, width: 0, height: 0 }}
    >
      <Animated.View style={ringStyle(a)} />
      <Animated.View style={ringStyle(b)} />
      <View
        style={{
          position: 'absolute',
          left: -coreHalf,
          top: -coreHalf,
          width: coreSize,
          height: coreSize,
          borderRadius: coreHalf,
          backgroundColor: color,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.55)',
        }}
      />
    </View>
  );
}
