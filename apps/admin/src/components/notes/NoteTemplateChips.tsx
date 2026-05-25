import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

export const QUICK_NOTE_TEMPLATES: readonly string[] = [
  'Customer called',
  'No answer',
  'Payment link sent',
  'Location confirmed',
  'GPS-only location',
  'Locking nut key confirmed',
  'Locking nut key unknown',
  'Needs replacement',
  'Customer prefers WhatsApp',
  'Cash terms confirmed',
  'Manual pricing review completed',
] as const;

interface NoteTemplateChipsProps {
  onPick: (template: string) => void;
  disabled?: boolean;
}

/**
 * Quick note chips — admin taps a chip and the parent inserts/appends the
 * template into its note input. Keep stateless so it can plug into any
 * notes panel or quick-booking field.
 */
export function NoteTemplateChips({
  onPick,
  disabled,
}: NoteTemplateChipsProps): React.JSX.Element {
  return (
    <View className="mt-1 mb-2">
      <Text className="text-text-dim text-[11px] mb-1">Quick notes</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {QUICK_NOTE_TEMPLATES.map((label) => (
          <Pressable
            key={label}
            disabled={disabled}
            onPress={() => onPick(label)}
            className={`px-3 py-1.5 mr-2 rounded-full border ${
              disabled
                ? 'border-border bg-surface opacity-50'
                : 'border-gold/60 bg-surface active:bg-gold/10'
            }`}
          >
            <Text className="text-gold text-xs">{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
