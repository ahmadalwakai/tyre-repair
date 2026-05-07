/**
 * PricingSafetySignal — renders the profit-guard verdict for a quote with
 * NORMAL / REVIEW / HIGH_RISK / BLOCK_PUBLIC_PAYMENT styling and an optional
 * action row (apply recommended payment / explain price / override with reason).
 *
 * All visible copy comes from `getAdminPricingSafetyCopy(safety)` so that
 * public-facing wording (e.g. "Call-first only", "Call the customer first")
 * never leaks into the admin UI.
 *
 * The red BLOCK level shows a soft pulsing border ~2s. No shaking text.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { AdminButton } from '@/components/ui/AdminButton';
import type {
  PricingRecommendedPaymentModeClient,
  PricingRiskLevelClient,
  PricingSafetyClient,
} from '@/lib/api/quick-booking-helpers';
import { getAdminPricingSafetyCopy } from './pricing-safety-copy';

export interface PricingSafetySignalProps {
  safety: PricingSafetyClient;
  /** Use the recommended payment mode (e.g. switch from cash to deposit). */
  onUseRecommendedPayment?: (mode: PricingRecommendedPaymentModeClient) => void;
  /** Open the customer-facing price explanation card / modal. */
  onExplainPrice?: () => void;
  /** Open the override-with-reason modal. Also used for "Confirm manually". */
  onOverrideWithReason?: () => void;
}

const TONE_BY_LEVEL: Record<
  PricingRiskLevelClient,
  { tone: 'success' | 'warning' | 'danger'; icon: string }
> = {
  NORMAL: { tone: 'success', icon: '✓' },
  REVIEW: { tone: 'warning', icon: '!' },
  HIGH_RISK: { tone: 'danger', icon: '!' },
  BLOCK_PUBLIC_PAYMENT: { tone: 'danger', icon: '✕' },
};

export function PricingSafetySignal({
  safety,
  onUseRecommendedPayment,
  onExplainPrice,
  onOverrideWithReason,
}: PricingSafetySignalProps): React.JSX.Element {
  const { tone, icon } = TONE_BY_LEVEL[safety.level];
  const isBlock = safety.level === 'BLOCK_PUBLIC_PAYMENT';
  const isHigh = safety.level === 'HIGH_RISK';
  const copy = getAdminPricingSafetyCopy(safety);

  // Pulsing border animation for BLOCK level only. Subtle, ~2s loop.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect((): (() => void) => {
    if (!isBlock) {
      return (): void => {};
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return (): void => loop.stop();
  }, [isBlock, pulse]);

  const borderOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.65],
  });

  const primary = copy.primaryButton;
  const handlePrimary = (): void => {
    if (!primary) return;
    if (
      primary.kind === 'apply_payment_mode' &&
      primary.paymentMode &&
      onUseRecommendedPayment
    ) {
      onUseRecommendedPayment(primary.paymentMode);
      return;
    }
    if (primary.kind === 'manual_review' && onOverrideWithReason) {
      onOverrideWithReason();
    }
  };

  // Hide the primary button if pressing it would do nothing useful.
  const showPrimary =
    primary !== null &&
    ((primary.kind === 'apply_payment_mode' && Boolean(onUseRecommendedPayment)) ||
      (primary.kind === 'manual_review' && Boolean(onOverrideWithReason)));

  return (
    <View>
      {isBlock ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -2,
            right: -2,
            top: -2,
            bottom: -2,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: '#ef4444',
            opacity: borderOpacity,
          }}
        />
      ) : null}
      <GoldCard
        tone={tone}
        priority={isHigh || isBlock ? 'high' : 'normal'}
        title={copy.title}
        icon={icon}
        eyebrow={`PRICING SAFETY · ${copy.statusLabel.toUpperCase()}`}
      >
        <Text className="text-text text-sm mb-3">{copy.message}</Text>

        {copy.adminReasons.length > 0 ? (
          <View className="mb-3">
            {copy.adminReasons.map(
              (r, i): React.JSX.Element => (
                <View key={`${i}-${r.slice(0, 24)}`} className="flex-row items-start mb-1">
                  <Text className="text-text-dim mr-2">•</Text>
                  <Text className="text-text-dim text-xs flex-1">{r}</Text>
                </View>
              ),
            )}
          </View>
        ) : null}

        {copy.adminRequiredConfirmations.length > 0 ? (
          <View className="bg-surface-elevated rounded-lg p-3 mb-3">
            <Text className="text-text-dim text-[10px] uppercase tracking-wider mb-2">
              Confirm before creating
            </Text>
            {copy.adminRequiredConfirmations.map(
              (c, i): React.JSX.Element => (
                <View
                  key={`conf-${i}-${c.slice(0, 24)}`}
                  className="flex-row items-start mb-1"
                >
                  <Text className="text-text mr-2">☐</Text>
                  <Text className="text-text text-xs flex-1">{c}</Text>
                </View>
              ),
            )}
          </View>
        ) : null}

        {copy.adminRecommendedNextSteps.length > 0 ? (
          <View className="mb-3">
            <Text className="text-text-dim text-[10px] uppercase tracking-wider mb-2">
              Suggested next steps
            </Text>
            {copy.adminRecommendedNextSteps.map(
              (s, i): React.JSX.Element => (
                <View
                  key={`step-${i}-${s.slice(0, 24)}`}
                  className="flex-row items-start mb-1"
                >
                  <Text className="text-brand-gold mr-2">→</Text>
                  <Text className="text-text-dim text-xs flex-1">{s}</Text>
                </View>
              ),
            )}
          </View>
        ) : null}

        <View className="bg-surface-elevated rounded-lg p-3 mb-3">
          <Text className="text-text-dim text-[10px] uppercase tracking-wider mb-1">
            Recommended action
          </Text>
          <Text className="text-text text-sm font-semibold mb-2">
            {copy.recommendedActionLabel}
          </Text>
          <Text className="text-text-dim text-[10px] uppercase tracking-wider mb-1">
            Recommended payment
          </Text>
          <Text className="text-text text-sm font-semibold">
            {copy.recommendedPaymentLabel}
          </Text>
          {safety.minimumRecommendedTotalGbp ? (
            <Text className="text-text-dim text-xs mt-2">
              Recommended minimum total: £{safety.minimumRecommendedTotalGbp}
            </Text>
          ) : null}
        </View>

        <View className="flex-row flex-wrap gap-2">
          {showPrimary && primary ? (
            <AdminButton
              label={primary.label}
              variant="primary"
              size="sm"
              onPress={handlePrimary}
            />
          ) : null}
          {onExplainPrice ? (
            <AdminButton
              label="Explain price"
              variant="secondary"
              size="sm"
              onPress={onExplainPrice}
            />
          ) : null}
          {onOverrideWithReason && safety.adminCanOverride ? (
            <AdminButton
              label="Override with reason"
              variant="ghost"
              size="sm"
              onPress={onOverrideWithReason}
            />
          ) : null}
        </View>
      </GoldCard>
    </View>
  );
}
