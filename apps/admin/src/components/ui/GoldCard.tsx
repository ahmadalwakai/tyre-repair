import React from 'react';
import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';

/**
 * GoldCard — the standard surface used across the admin app.
 *
 * Backwards compatible: existing usages `<GoldCard className="...">…</GoldCard>`
 * keep working unchanged. The new optional props add a left accent bar,
 * priority emphasis, an opt-in standard header, and ripple/press behaviour
 * so screens stop hand-rolling these patterns.
 *
 * Visual hierarchy guide for operators (top → bottom of a card):
 *   1. Accent bar (3px) on the left  — instant tone scan
 *   2. Title row                      — what is this card about
 *   3. Hero value (caller's content)  — large bold number/text
 *   4. Supporting text                — small, muted
 *   5. One primary action             — what to do next
 *
 * Keep cards to ONE primary fact + ONE primary action wherever possible.
 */

export type GoldCardTone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
export type GoldCardPriority = 'low' | 'normal' | 'high';

const TONE_ACCENT: Record<GoldCardTone, string> = {
  default: 'bg-border',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-gold',
  gold: 'bg-gold',
};

const TONE_BORDER: Record<GoldCardTone, string> = {
  default: 'border-border',
  success: 'border-success/40',
  warning: 'border-warning/40',
  danger: 'border-danger/40',
  info: 'border-gold/30',
  gold: 'border-gold/60',
};

const TONE_ICON_BG: Record<GoldCardTone, string> = {
  default: 'bg-surfaceMuted',
  success: 'bg-success/15',
  warning: 'bg-warning/20',
  danger: 'bg-danger/20',
  info: 'bg-gold/15',
  gold: 'bg-gold/20',
};

const TONE_ICON_TEXT: Record<GoldCardTone, string> = {
  default: 'text-text-muted',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-gold',
  gold: 'text-gold',
};

const PRIORITY_PADDING: Record<GoldCardPriority, string> = {
  low: 'p-3',
  normal: 'p-4',
  high: 'p-5',
};

interface GoldCardProps {
  children?: React.ReactNode;
  className?: string;
  /**
   * Visual tone — paints the 3px left accent bar and tints the border.
   * Use to let the operator triage 20 cards at a glance.
   */
  tone?: GoldCardTone;
  /**
   * Layout density. `high` adds extra padding + a subtle gold glow ring,
   * making the card pop from a list of normal-priority siblings.
   */
  priority?: GoldCardPriority;
  /**
   * Makes the entire card pressable with a soft ripple + chevron affordance.
   * Provide `onPress` together with this flag.
   */
  interactive?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  /** Opt-in header row. When provided, renders icon + title + optional badge. */
  title?: string;
  icon?: string;
  headerRight?: React.ReactNode;
  /** Optional eyebrow line above the title (e.g. "BOOKING #B1234"). */
  eyebrow?: string;
  testID?: string;
}

export function GoldCard({
  children,
  className,
  tone = 'default',
  priority = 'normal',
  interactive = false,
  onPress,
  onLongPress,
  title,
  icon,
  headerRight,
  eyebrow,
  testID,
}: GoldCardProps): React.JSX.Element {
  const padding = PRIORITY_PADDING[priority];
  const borderTone = TONE_BORDER[tone];
  const accent = TONE_ACCENT[tone];
  const glow = priority === 'high' ? 'shadow-lg shadow-gold/20' : '';
  const showAccent = tone !== 'default' || priority === 'high';
  const accentColor = priority === 'high' && tone === 'default' ? 'bg-gold' : accent;
  const hasHeader = Boolean(title ?? icon ?? eyebrow ?? headerRight);

  const innerHeader = hasHeader ? (
    <View className="flex-row items-start justify-between mb-3">
      <View className="flex-row items-start flex-1 pr-2">
        {icon ? (
          <View
            className={`w-8 h-8 rounded-lg ${TONE_ICON_BG[tone]} items-center justify-center mr-3`}
          >
            <Text className={`${TONE_ICON_TEXT[tone]} text-base`}>{icon}</Text>
          </View>
        ) : null}
        <View className="flex-1">
          {eyebrow ? (
            <Text className="text-text-dim text-[10px] uppercase tracking-wider mb-0.5">
              {eyebrow}
            </Text>
          ) : null}
          {title ? (
            <Text className="text-text font-semibold text-base" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>
      </View>
      {headerRight ? <View className="ml-2">{headerRight}</View> : null}
    </View>
  ) : null;

  const inner = (
    <View
      className={`rounded-2xl bg-surface border ${borderTone} ${padding} ${glow} ${
        showAccent ? 'overflow-hidden' : ''
      } ${className ?? ''}`}
      testID={testID}
    >
      {showAccent ? (
        <View
          className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`}
          pointerEvents="none"
        />
      ) : null}
      {innerHeader}
      {children}
    </View>
  );

  if (interactive && (onPress ?? onLongPress)) {
    return (
      <Pressable
        {...(onPress ? { onPress } : {})}
        {...(onLongPress ? { onLongPress } : {})}
        android_ripple={{ color: 'rgba(212,175,55,0.12)', borderless: false }}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
}
