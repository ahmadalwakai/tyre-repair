import React from 'react';
import { View, Text } from 'react-native';
import { bookingStatusLabel } from '@/lib/format/labels';

/** Visual tones available to {@link StatusBadge}. */
export type StatusBadgeTone =
  | 'high'
  | 'medium'
  | 'normal'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'emergency';

/** Tailwind classes per tone — kept consistent across all admin screens. */
const TONE_CLASSES: Record<StatusBadgeTone, { bg: string; text: string }> = {
  high: { bg: 'bg-warning/25', text: 'text-warning' },
  medium: { bg: 'bg-gold/20', text: 'text-gold' },
  normal: { bg: 'bg-surfaceMuted', text: 'text-text' },
  success: { bg: 'bg-success/20', text: 'text-success' },
  warning: { bg: 'bg-warning/20', text: 'text-warning' },
  danger: { bg: 'bg-danger/25', text: 'text-danger' },
  info: { bg: 'bg-gold/15', text: 'text-gold' },
  muted: { bg: 'bg-surfaceMuted', text: 'text-text-muted' },
  emergency: { bg: 'bg-danger/40', text: 'text-white' },
};

/** Map booking-status strings onto a visual tone. */
const STATUS_TO_TONE: Record<string, StatusBadgeTone> = {
  pending_payment: 'warning',
  confirmed: 'success',
  dispatching: 'info',
  dispatched: 'info',
  on_site: 'medium',
  completed: 'success',
  cancelled: 'danger',
  refunded: 'muted',
  failed: 'danger',
};

export interface StatusBadgeProps {
  /** Booking-status string (legacy API). Mutually exclusive with `tone` + `label`. */
  status?: string;
  /** Explicit tone. Use with `label` for arbitrary badges. */
  tone?: StatusBadgeTone;
  /** Override label text — required when `status` is not provided. */
  label?: string;
}

/**
 * StatusBadge — small, dense, consistently-styled tag.
 *
 * Two ways to use:
 *  1. Legacy: `<StatusBadge status="pending_payment" />` — auto-resolves
 *     label via `bookingStatusLabel()` and picks a tone.
 *  2. New: `<StatusBadge tone="danger" label="Refund failed" />`.
 */
export function StatusBadge({ status, tone, label }: StatusBadgeProps): React.JSX.Element {
  const resolvedTone: StatusBadgeTone =
    tone ?? (status ? (STATUS_TO_TONE[status] ?? 'normal') : 'normal');
  const resolvedLabel = label ?? (status ? bookingStatusLabel(status) : '');
  const cls = TONE_CLASSES[resolvedTone];
  return (
    <View className={`px-2 py-1 rounded-md self-start ${cls.bg}`}>
      <Text className={`text-[11px] font-semibold uppercase tracking-wide ${cls.text}`}>
        {resolvedLabel}
      </Text>
    </View>
  );
}
