import React, { useEffect, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

type Variant = 'success' | 'offline' | 'celebrate';

interface Props {
  variant?: Variant;
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  style?: ViewStyle;
}

type LottieSource = React.ComponentProps<typeof LottieView>['source'];

const SOURCES: Record<Variant, LottieSource> = {
  success: require('../../../assets/lottie/success.json') as LottieSource,
  // Reuse the same JSON as the placeholder for other variants; swap with
  // real animations later without changing call sites.
  offline: require('../../../assets/lottie/success.json') as LottieSource,
  celebrate: require('../../../assets/lottie/success.json') as LottieSource,
};

/**
 * Lightweight Lottie wrapper for celebratory / state animations.
 * Swap the JSON in `assets/lottie/` to upgrade visuals without touching code.
 */
export function LottieBurst({
  variant = 'success',
  size = 140,
  loop = false,
  autoPlay = true,
  style,
}: Props): React.JSX.Element {
  const ref = useRef<LottieView>(null);
  useEffect(() => {
    if (autoPlay) ref.current?.play();
  }, [autoPlay, variant]);
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <LottieView
        ref={ref}
        source={SOURCES[variant]}
        autoPlay={autoPlay}
        loop={loop}
        style={{ width: size, height: size }}
      />
    </View>
  );
}
