import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * ConfettiBurst — one-shot celebratory particle burst.
 *
 * Used on success moments: paid booking, completed job, hit revenue target.
 * Pure React Native + Reanimated (no native module). Particles spawn from
 * the centre of the parent, fly outward in a circle, fall under gravity
 * and fade out. Total runtime ~1.4 s.
 *
 * Imperative API:
 *   const ref = useRef<ConfettiBurstHandle>(null);
 *   ref.current?.fire();
 *
 * Or declarative via `trigger` prop change:
 *   <ConfettiBurst trigger={lastWinId} />
 *
 * Place inside a parent `<View pointerEvents="box-none">` covering the
 * screen if you want full-screen confetti; otherwise it bursts within
 * its parent's bounds.
 */
const BRAND = ['#E30613', '#F01825', '#FF6B7A', '#FFFFFF', '#F5F5F7'];

export interface ConfettiBurstHandle {
  fire: () => void;
}

interface Props {
  /** Change this value to fire a burst declaratively. */
  trigger?: number | string | null;
  count?: number;
  /** Fired when the burst finishes (so callers can unmount). */
  onComplete?: () => void;
}

export const ConfettiBurst = React.forwardRef<ConfettiBurstHandle, Props>(function ConfettiBurst(
  { trigger, count = 24, onComplete },
  ref,
) {
  const seedRef = useRef(0);
  const [activeSeed, setActiveSeed] = React.useState<number | null>(null);

  const fire = React.useCallback(() => {
    seedRef.current += 1;
    setActiveSeed(seedRef.current);
  }, []);

  useImperativeHandle(ref, () => ({ fire }), [fire]);

  useEffect(() => {
    if (trigger == null) return;
    fire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const handleParticleDone = React.useCallback(() => {
    // Reset after the last particle would have finished. We don't track
    // each one — just unmount after the full duration via setTimeout.
  }, []);

  useEffect(() => {
    if (activeSeed == null) return;
    const t = setTimeout(() => {
      setActiveSeed(null);
      onComplete?.();
    }, 1500);
    return () => clearTimeout(t);
  }, [activeSeed, onComplete]);

  if (activeSeed == null) return null;

  const { width, height } = Dimensions.get('window');

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const distance = 110 + Math.random() * 160;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance - 80 - Math.random() * 80; // upward bias
        const color = BRAND[i % BRAND.length] ?? '#E30613';
        return (
          <Particle
            key={`${activeSeed}-${i}`}
            originX={width / 2}
            originY={height / 2}
            dx={dx}
            dy={dy}
            color={color}
            onDone={handleParticleDone}
          />
        );
      })}
    </View>
  );
});

function Particle({
  originX,
  originY,
  dx,
  dy,
  color,
  onDone,
}: {
  originX: number;
  originY: number;
  dx: number;
  dy: number;
  color: string;
  onDone: () => void;
}): React.JSX.Element {
  const progress = useSharedValue(0);
  const fall = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    fall.value = withTiming(1, { duration: 1400, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
    rotate.value = withTiming(360 + Math.random() * 360, { duration: 1400 });
  }, [progress, fall, rotate, onDone]);

  const style = useAnimatedStyle(() => {
    const x = dx * progress.value;
    const y = dy * progress.value + 240 * (fall.value * fall.value);
    const opacity = 1 - fall.value;
    return {
      position: 'absolute',
      left: originX - 4,
      top: originY - 6,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rotate.value}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 12,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
