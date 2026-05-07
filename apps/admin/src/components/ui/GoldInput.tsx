import React from 'react';
import { TextInput, View, Text, type TextInputProps } from 'react-native';

export interface GoldInputProps extends TextInputProps {
  label?: string;
  errorText?: string;
}

export function GoldInput({ label, errorText, className, ...rest }: GoldInputProps): React.JSX.Element {
  return (
    <View className="w-full">
      {label ? <Text className="text-text-muted text-sm mb-1">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#6B6B75"
        className={`bg-surfaceMuted text-text rounded-xl px-4 py-3 border border-border ${className ?? ''}`}
        {...rest}
      />
      {errorText ? <Text className="text-danger text-xs mt-1">{errorText}</Text> : null}
    </View>
  );
}
