import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import {
  getBookingPaymentSummary,
  type BookingPaymentSummaryResponse,
} from '@/lib/api/financial-safety';
import { ApiError } from '@/lib/api/client';

interface Props {
  bookingId: string;
  refreshKey?: number;
  onCancelPress?: () => void;
  onSendPaymentLink?: () => void;
  onSendBalanceLink?: () => void;
}

function toneClass(state: string): { bg: string; border: string; text: string; label: string } {
  switch (state) {
    case 'paid_in_full':
    case 'balance_paid':
      return { bg: 'bg-success/10', border: 'border-success', text: 'text-success', label: 'Paid' };
    case 'deposit_paid_balance_due':
      return { bg: 'bg-warning/10', border: 'border-warning', text: 'text-warning', label: 'Deposit paid — balance due' };
    case 'processing':
      return { bg: 'bg-warning/10', border: 'border-warning', text: 'text-warning', label: 'Processing' };
    case 'failed':
      return { bg: 'bg-danger/10', border: 'border-danger', text: 'text-danger', label: 'Failed' };
    case 'refunded':
      return { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-300', label: 'Refunded' };
    case 'manual_review':
      return { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-300', label: 'Manual review' };
    case 'cancelled':
      return { bg: 'bg-danger/10', border: 'border-danger', text: 'text-danger', label: 'Cancelled' };
    case 'unpaid':
    default:
      return { bg: 'bg-surfaceMuted', border: 'border-border', text: 'text-text', label: 'Unpaid' };
  }
}

export function BookingPaymentPanel(props: Props): React.JSX.Element {
  const { bookingId, refreshKey, onCancelPress, onSendPaymentLink, onSendBalanceLink } = props;
  const [summary, setSummary] = useState<BookingPaymentSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBookingPaymentSummary(bookingId);
      setSummary(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load payment summary');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (loading && !summary) {
    return (
      <GoldCard>
        <Text className="text-text-muted">Loading payment summary…</Text>
      </GoldCard>
    );
  }
  if (error) {
    return (
      <GoldCard>
        <Text className="text-danger">{error}</Text>
      </GoldCard>
    );
  }
  if (!summary) return <View />;

  const tone = toneClass(summary.state);
  return (
    <View>
      <View className={`rounded-2xl p-4 mb-2 border ${tone.bg} ${tone.border}`}>
        <Text className={`text-xs uppercase tracking-wide ${tone.text}`}>{tone.label}</Text>
        <Text className="text-text text-lg font-semibold mt-1">
          £{summary.amountPaidGbp}
          {summary.totalPriceGbp ? ` of £${summary.totalPriceGbp}` : ''}
        </Text>
        {summary.outstandingBalanceGbp !== '0.00' ? (
          <Text className="text-text-muted text-xs mt-1">
            Outstanding balance: £{summary.outstandingBalanceGbp}
          </Text>
        ) : null}
        <Text className="text-text-muted text-xs mt-1">
          Stock decremented: {summary.stockDecremented ? 'Yes' : 'No'} • Job: {summary.jobType}
        </Text>
      </View>

      <GoldCard className="mb-2">
        <Text className="text-text font-semibold mb-2">Breakdown</Text>
        <Row label="Deposit paid" value={`£${summary.depositPaidGbp}`} />
        <Row label="Balance paid" value={`£${summary.balancePaidGbp}`} />
        <Row label="Adjustment paid" value={`£${summary.adjustmentPaidGbp}`} />
        {summary.depositRequiredGbp ? (
          <Row label="Deposit required" value={`£${summary.depositRequiredGbp}`} />
        ) : null}
      </GoldCard>

      {summary.cancellation ? (
        <GoldCard className="mb-2">
          <Text className="text-text font-semibold mb-1">Cancellation</Text>
          <Text className="text-text-muted text-xs">Stage: {summary.cancellation.stage}</Text>
          <Text className="text-text-muted text-xs">Decision: {summary.cancellation.depositDecision}</Text>
          <Text className="text-text-muted text-xs">Reason: {summary.cancellation.reason}</Text>
          {summary.cancellation.retainedAmountGbp ? (
            <Text className="text-text-muted text-xs">Retained: £{summary.cancellation.retainedAmountGbp}</Text>
          ) : null}
          {summary.cancellation.refundDueGbp ? (
            <Text className="text-text-muted text-xs">Refund (review): £{summary.cancellation.refundDueGbp}</Text>
          ) : null}
        </GoldCard>
      ) : null}

      <GoldCard>
        <Text className="text-text font-semibold mb-2">Recent payments</Text>
        {summary.payments.length === 0 ? (
          <Text className="text-text-muted text-xs">No payments yet.</Text>
        ) : (
          summary.payments.slice(0, 6).map((p) => (
            <View key={p.paymentId} className="flex-row justify-between py-1">
              <Text className="text-text text-xs">{p.kind} • {p.status}</Text>
              <Text className="text-text text-xs">£{p.amountGbp}</Text>
            </View>
          ))
        )}
      </GoldCard>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {onSendPaymentLink && summary.state === 'unpaid' ? (
          <ActionButton label="Send payment link" onPress={onSendPaymentLink} />
        ) : null}
        {onSendBalanceLink && summary.state === 'deposit_paid_balance_due' ? (
          <ActionButton label="Send balance link" onPress={onSendBalanceLink} />
        ) : null}
        {onCancelPress && !summary.isCancelled ? (
          <ActionButton label="Cancel booking" onPress={onCancelPress} variant="danger" />
        ) : null}
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-text-muted text-xs">{label}</Text>
      <Text className="text-text text-xs">{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = 'secondary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'secondary' | 'danger';
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-xl px-4 py-2 ${variant === 'danger' ? 'bg-danger' : 'bg-surfaceMuted'}`}
    >
      <Text className={variant === 'danger' ? 'text-canvas' : 'text-text'}>{label}</Text>
    </Pressable>
  );
}
