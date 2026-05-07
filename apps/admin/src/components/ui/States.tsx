import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { AdminButton, type AdminButtonVariant } from './AdminButton';

export function LoadingState({ label }: { label?: string }): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <ActivityIndicator color="#D4AF37" />
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
  action,
}: {
  message: string;
  action?: EmptyStateAction;
}): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-text-muted text-center mb-4">{message}</Text>
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
