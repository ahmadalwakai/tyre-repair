import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { AdminButton, type AdminButtonVariant } from './AdminButton';
import { EmptyIllustration, type EmptyIllustrationKind } from './EmptyIllustration';

export function LoadingState({ label }: { label?: string }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <ActivityIndicator color="#E30613" />
      {label ? <Text className="text-text-muted mt-3">{label}</Text> : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-danger text-center mb-4">{message}</Text>
      {onRetry ? (
        <AdminButton label="Retry" variant="secondary" size="md" onPress={onRetry} />
      ) : null}
    </View>
  );
}

export interface EmptyStateAction {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: AdminButtonVariant;
}

export function EmptyState({
  message,
  title,
  illustration,
  action,
}: {
  message: string;
  title?: string;
  illustration?: EmptyIllustrationKind;
  action?: EmptyStateAction;
}): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center p-6">
      {illustration ? (
        <View style={{ marginBottom: 16, opacity: 0.95 }}>
          <EmptyIllustration kind={illustration} size={132} />
        </View>
      ) : null}
      {title ? (
        <Text className="text-text text-lg font-semibold mb-2 text-center">{title}</Text>
      ) : null}
      <Text className="text-text-muted text-center mb-4 max-w-[320px]">{message}</Text>
      {action ? (
        <AdminButton
          label={action.label}
          onPress={action.onPress}
          variant={action.variant ?? 'secondary'}
          size="md"
        />
      ) : null}
    </View>
  );
}
