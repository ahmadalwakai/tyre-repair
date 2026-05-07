import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { usePressScale } from '@/hooks/usePressScale';

export type AdminButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning'
  | 'whatsapp'
  | 'subtle';

export type AdminButtonSize = 'sm' | 'md' | 'lg';

export interface AdminButtonProps {
  label: string;
  onPress?: () => void | Promise<void>;
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

interface VariantStyle {
  container: string;
  text: string;
  spinner: string;
}

const VARIANT_STYLES: Record<AdminButtonVariant, VariantStyle> = {
  primary: {
    // Gold filled, black text — premium TyreRepair UK identity.
    container: 'bg-gold border border-gold',
    text: 'text-canvas',
    spinner: '#0B0B0F',
  },
  secondary: {
    // Dark surface with gold border + gold text. Calm but visible.
    container: 'bg-surface border border-gold/60',
    text: 'text-gold',
    spinner: '#D4AF37',
  },
  ghost: {
    // Truly subtle — no border, no fill. Used for Cancel / Dismiss.
    container: 'bg-transparent border border-transparent',
    text: 'text-text-muted',
    spinner: '#A0A0A8',
  },
  danger: {
    // Red filled. Reserved for genuinely destructive actions.
    container: 'bg-danger border border-danger',
    text: 'text-white',
    spinner: '#FFFFFF',
  },
  success: {
    container: 'bg-success/15 border border-success',
    text: 'text-success',
    spinner: '#22C55E',
  },
  warning: {
    container: 'bg-warning/15 border border-warning',
    text: 'text-warning',
    spinner: '#F59E0B',
  },
  whatsapp: {
    // WhatsApp green — secondary to the main call action.
    container: 'bg-[#25D366]/15 border border-[#25D366]',
    text: 'text-[#25D366]',
    spinner: '#25D366',
  },
  subtle: {
    // Quiet filled action — for low-priority utility buttons.
    container: 'bg-surfaceMuted border border-border',
    text: 'text-text',
    spinner: '#F5F5F7',
  },
};

interface SizeStyle {
  container: string;
  text: string;
  minHeight: number;
  spinnerSize: 'small' | 'large';
  iconGap: string;
}

const SIZE_STYLES: Record<AdminButtonSize, SizeStyle> = {
  sm: {
    container: 'px-3 py-2 rounded-lg',
    text: 'text-xs font-semibold',
    minHeight: 44,
    spinnerSize: 'small',
    iconGap: 'gap-1.5',
  },
  md: {
    container: 'px-4 py-3 rounded-xl',
    text: 'text-sm font-semibold',
    minHeight: 48,
    spinnerSize: 'small',
    iconGap: 'gap-2',
  },
  lg: {
    container: 'px-5 py-4 rounded-xl',
    text: 'text-base font-semibold',
    minHeight: 54,
    spinnerSize: 'small',
    iconGap: 'gap-2.5',
  },
};

/**
 * AdminButton — single source of truth for buttons in the admin app.
 *
 * Replaces ad-hoc Pressable + Text patterns. Backwards compatible with
 * `GoldButton` (which now wraps this).
 *
 * Behaviour:
 *  - Minimum tap targets: 44 (sm), 48 (md), 54 (lg).
 *  - Loading state shows a spinner, swaps `label` for `loadingLabel`,
 *    and prevents `onPress` from firing again until the in-flight async
 *    handler resolves.
 *  - Press scales gently down to 0.97 via Reanimated.
 */
export function AdminButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  loadingLabel,
  iconLeft,
  iconRight,
  fullWidth = false,
  accessibilityLabel,
  testID,
}: AdminButtonProps): React.JSX.Element {
  const [internalBusy, setInternalBusy] = useState(false);
  const isBusy = loading || internalBusy;
  const isDisabled = disabled || isBusy;

  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];

  const press = usePressScale({ disabled: isDisabled });

  const handlePress = useCallback(async (): Promise<void> => {
    if (isDisabled || !onPress) return;
    let result: void | Promise<void>;
    try {
      result = onPress();
    } catch {
      return;
    }
    if (result instanceof Promise) {
      setInternalBusy(true);
      try {
        await result;
      } finally {
        setInternalBusy(false);
      }
    }
  }, [isDisabled, onPress]);

  const displayLabel = isBusy && loadingLabel ? loadingLabel : label;

  return (
    <press.AnimatedView
      style={press.style}
      className={fullWidth ? 'w-full self-stretch' : 'self-start'}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: isBusy }}
        testID={testID}
        onPress={handlePress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={isDisabled}
        style={{ minHeight: sizeStyle.minHeight }}
        className={`flex-row items-center justify-center ${sizeStyle.container} ${variantStyle.container} ${
          isDisabled ? 'opacity-60' : ''
        }`}
      >
        {isBusy ? (
          <View className={`flex-row items-center ${sizeStyle.iconGap}`}>
            <ActivityIndicator size={sizeStyle.spinnerSize} color={variantStyle.spinner} />
            {displayLabel ? (
              <Text className={`${sizeStyle.text} ${variantStyle.text}`}>{displayLabel}</Text>
            ) : null}
          </View>
        ) : (
          <View className={`flex-row items-center ${sizeStyle.iconGap}`}>
            {iconLeft ? <View>{iconLeft}</View> : null}
            <Text className={`${sizeStyle.text} ${variantStyle.text}`} numberOfLines={1}>
              {displayLabel}
            </Text>
            {iconRight ? <View>{iconRight}</View> : null}
          </View>
        )}
      </Pressable>
    </press.AnimatedView>
  );
}
