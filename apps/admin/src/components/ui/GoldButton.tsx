import React from 'react';
import { AdminButton, type AdminButtonVariant } from './AdminButton';

/**
 * Backwards-compatible wrapper around {@link AdminButton}.
 *
 * Existing screens import `GoldButton` with the legacy three-variant API
 * (`primary` | `secondary` | `danger`). Rather than touch every call site,
 * we keep the export and forward to the new system.
 *
 * New code should import {@link AdminButton} directly to gain access to
 * sizes, loading labels, icons, and the full variant set.
 */
export interface GoldButtonProps {
  label: string;
  onPress?: () => void | Promise<void>;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export function GoldButton({
  label,
  onPress,
  loading,
  loadingLabel,
  disabled,
  variant = 'primary',
  fullWidth,
  accessibilityLabel,
  testID,
}: GoldButtonProps): React.JSX.Element {
  // Map the legacy three-variant API onto the richer AdminButton variants.
  // Legacy 'secondary' was a quiet filled grey button; map to 'subtle'
  // for the closest visual match.
  const mapped: AdminButtonVariant =
    variant === 'primary' ? 'primary' : variant === 'danger' ? 'danger' : 'subtle';
  // exactOptionalPropertyTypes: avoid passing `undefined` for optional fields.
  const props: React.ComponentProps<typeof AdminButton> = {
    label,
    variant: mapped,
    size: 'lg',
  };
  if (onPress !== undefined) props.onPress = onPress;
  if (loading !== undefined) props.loading = loading;
  if (loadingLabel !== undefined) props.loadingLabel = loadingLabel;
  if (disabled !== undefined) props.disabled = disabled;
  if (fullWidth !== undefined) props.fullWidth = fullWidth;
  if (accessibilityLabel !== undefined) props.accessibilityLabel = accessibilityLabel;
  if (testID !== undefined) props.testID = testID;
  return <AdminButton {...props} />;
}
