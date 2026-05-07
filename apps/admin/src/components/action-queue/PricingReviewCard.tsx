import React, { useCallback, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { AdminButton } from '@/components/ui/AdminButton';
import { useToast } from '@/components/ui/Toast';
import { reviewActionQueueItem } from '@/lib/api/action-queue-items';
import type {
  ActionQueueItemDto,
  ActionQueueSuggestedPayment,
} from '@/types/action-queue-items';

/**
 * Renders a PRICING_REVIEW_REQUIRED action queue item.
 *
 * Wording is admin-only — it must NEVER say "Call first" / "Public should
 * call first". Public-facing copy lives on the customer-facing routes.
 */

const REASON_LABELS: Record<string, string> = {
  LONG_DISTANCE: 'Long distance',
  VERY_LONG_DISTANCE: 'Very long distance',
  LONG_DISTANCE_ASSESSMENT: 'Long-distance assessment',
  ASSESSMENT_MAY_BE_LOSS_MAKING: 'Assessment may not cover travel',
  CASH_ON_SITE_RISK: 'Cash on site risk',
  GPS_ONLY_LOCATION: 'GPS-only location',
  WEAK_LOCATION: 'Weak location match',
  HIGH_TRAFFIC: 'Heavy traffic',
  LATE_NIGHT: 'Late night',
  WEEKEND: 'Weekend',
  BANK_HOLIDAY: 'Bank holiday',
  BAD_WEATHER: 'Severe weather',
  HIGH_DEMAND: 'High demand',
  LOCKING_NUT_NO_KEY: 'Missing locking nut key',
  LOCKING_NUT_UNKNOWN: 'Locking nut status unknown',
  OUTSIDE_NORMAL_COVERAGE: 'Outside normal coverage',
  BELOW_RECOMMENDED_MINIMUM: 'Below minimum',
  MANUAL_REVIEW_REQUIRED: 'Manual review',
};

function reasonLabel(code: string): string {
  return REASON_LABELS[code] ?? code;
}

const PAYMENT_LABELS: Record<ActionQueueSuggestedPayment, string> = {
  CASH: 'Cash on site',
  DEPOSIT_15: '15% deposit',
  FULL: 'Full payment',
  MANUAL_REVIEW: 'Manual review',
};

export interface PricingReviewCardProps {
  item: ActionQueueItemDto;
  /** Called after a successful review/dismiss so the parent can drop the row. */
  onResolved: (id: string) => void;
}

export function PricingReviewCard({
  item,
  onResolved,
}: PricingReviewCardProps): React.JSX.Element {
  const toast = useToast();
  const [busy, setBusy] = useState<null | 'review' | 'note' | 'open' | 'payment'>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  const handleOpenBooking = useCallback((): void => {
    if (!item.bookingId || busy) return;
    setBusy('open');
    try {
      router.push(`/bookings/${item.bookingId}` as never);
    } finally {
      setBusy(null);
    }
  }, [busy, item.bookingId]);

  const handleUseRecommendedPayment = useCallback((): void => {
    if (!item.bookingId || busy) return;
    setBusy('payment');
    try {
      const params = new URLSearchParams();
      params.set('bookingId', item.bookingId);
      if (item.suggestedPayment) params.set('suggestedPayment', item.suggestedPayment);
      router.push(`/quick-booking?${params.toString()}` as never);
    } finally {
      setBusy(null);
    }
  }, [busy, item.bookingId, item.suggestedPayment]);

  const submitReview = useCallback(
    async (note?: string): Promise<void> => {
      if (busy) return;
      setBusy(note ? 'note' : 'review');
      try {
        await reviewActionQueueItem(item.id, {
          resolution: 'REVIEWED',
          ...(note ? { note } : {}),
        });
        toast.success('Marked reviewed');
        onResolved(item.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not mark reviewed');
      } finally {
        setBusy(null);
      }
    },
    [busy, item.id, onResolved, toast],
  );

  const handleSaveNote = useCallback(async (): Promise<void> => {
    const trimmed = noteText.trim();
    if (!trimmed) {
      toast.warning('Add a note first');
      return;
    }
    setNoteOpen(false);
    await submitReview(trimmed);
    setNoteText('');
  }, [noteText, submitReview, toast]);

  const reasonsText =
    item.reasons.length > 0 ? item.reasons.map(reasonLabel).join(' · ') : 'No reasons recorded';

  return (
    <AnimatedCard className="rounded-2xl border border-gold/40 bg-surface p-4 mb-3">
      <Text className="text-gold font-semibold text-base">{item.title}</Text>
      <Text className="text-fg-muted text-sm mt-1">{reasonsText}</Text>

      {item.suggestedPayment ? (
        <View className="mt-2 self-start rounded-full border border-gold/40 px-2 py-0.5">
          <Text className="text-gold text-xs">
            Suggested: {PAYMENT_LABELS[item.suggestedPayment]}
          </Text>
        </View>
      ) : null}

      {item.recommendedNextSteps.length > 0 ? (
        <View className="mt-3">
          <Text className="text-fg-muted text-xs uppercase tracking-wider">
            Recommended next steps
          </Text>
          {item.recommendedNextSteps.map((step, idx) => (
            <Text key={idx} className="text-fg text-sm mt-1">
              • {step}
            </Text>
          ))}
        </View>
      ) : null}

      <View className="mt-4 flex-row flex-wrap gap-2">
        {item.bookingId ? (
          <AdminButton
            label="Open booking"
            variant="secondary"
            size="sm"
            onPress={handleOpenBooking}
            loading={busy === 'open'}
            disabled={busy !== null}
          />
        ) : null}
        {item.bookingId && item.suggestedPayment ? (
          <AdminButton
            label="Use recommended payment"
            variant="primary"
            size="sm"
            onPress={handleUseRecommendedPayment}
            loading={busy === 'payment'}
            disabled={busy !== null}
          />
        ) : null}
        <AdminButton
          label="Mark reviewed"
          variant="success"
          size="sm"
          onPress={() => {
            void submitReview();
          }}
          loading={busy === 'review'}
          disabled={busy !== null}
        />
        <AdminButton
          label="Add note"
          variant="ghost"
          size="sm"
          onPress={() => setNoteOpen(true)}
          disabled={busy !== null}
        />
      </View>

      <Modal
        visible={noteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/60 items-center justify-center p-6"
          onPress={() => setNoteOpen(false)}
        >
          <Pressable
            className="w-full rounded-2xl bg-surface border border-gold/40 p-4"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-gold font-semibold text-base mb-2">Add review note</Text>
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={4}
              placeholder="Internal note (admins only)"
              placeholderTextColor="#7a7a7a"
              className="min-h-[88px] rounded-lg border border-gold/30 bg-canvas p-3 text-fg"
              style={{ minHeight: 88, textAlignVertical: 'top' }}
            />
            <View className="mt-3 flex-row justify-end gap-2">
              <AdminButton
                label="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => setNoteOpen(false)}
                disabled={busy !== null}
              />
              <AdminButton
                label="Save & mark reviewed"
                variant="primary"
                size="sm"
                onPress={() => {
                  void handleSaveNote();
                }}
                loading={busy === 'note'}
                disabled={busy !== null}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AnimatedCard>
  );
}
