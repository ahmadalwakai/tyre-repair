import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import {
  getCashReconciliation,
  type CashReconciliationResponse,
} from '@/lib/api/financial-safety';
import { ApiError } from '@/lib/api/client';

interface Props {
  initialDate?: string;
  onOpenBooking?: (bookingId: string) => void;
  onSendBalanceLink?: (bookingId: string) => void;
}

function todayLondon(): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

function shiftDate(dateStr: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(dateStr);
  if (!m) return dateStr;
  const d = new Date(Date.UTC(parseInt(m[1] ?? '0', 10), parseInt(m[2] ?? '1', 10) - 1, parseInt(m[3] ?? '1', 10)));
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

export function CashReconciliationScreen(props: Props): React.JSX.Element {
  const { initialDate, onOpenBooking, onSendBalanceLink } = props;
  const [date, setDate] = useState<string>(initialDate ?? todayLondon());
  const [data, setData] = useState<CashReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCashReconciliation(date);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load report');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#D4AF37" />}
    >
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          onPress={() => setDate((d) => shiftDate(d, -1))}
          className="rounded-xl bg-surfaceMuted px-3 py-2"
        >
          <Text className="text-text">←</Text>
        </Pressable>
        <View>
          <Text className="text-text text-base font-semibold text-center">{date}</Text>
          <Text className="text-text-muted text-xs text-center">Europe/London day</Text>
        </View>
        <Pressable
          onPress={() => setDate((d) => shiftDate(d, 1))}
          className="rounded-xl bg-surfaceMuted px-3 py-2"
        >
          <Text className="text-text">→</Text>
        </Pressable>
      </View>

      {error ? (
        <GoldCard className="mb-3">
          <Text className="text-danger">{error}</Text>
        </GoldCard>
      ) : null}

      {data ? (
        <>
          <GoldCard className="mb-3">
            <Text className="text-text-muted text-xs uppercase">Collected today (succeeded only)</Text>
            <Text className="text-text text-2xl font-bold mt-1">£{data.collectedTotalGbp}</Text>
          </GoldCard>

          <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
            <Stat label="Full payments" value={`£${data.fullPaymentsGbp}`} />
            <Stat label="Deposits" value={`£${data.depositPaymentsGbp}`} />
            <Stat label="Balances" value={`£${data.balancePaymentsGbp}`} />
            <Stat label="Adjustments" value={`£${data.adjustmentPaymentsGbp}`} />
            <Stat label="Refund (marked)" value={`£${data.refundMarkedGbp}`} tone="purple" />
            <Stat label="Deposit retained" value={`£${data.depositRetainedGbp}`} tone="warn" />
            <Stat label="Outstanding balance" value={`£${data.outstandingBalanceGbp}`} tone="warn" />
            <Stat label="Failed" value={String(data.failedPaymentsCount)} tone="danger" />
            <Stat label="Cancelled bookings" value={String(data.cancelledBookingsCount)} tone="danger" />
            <Stat label="Paid bookings" value={String(data.paidBookingsCount)} tone="success" />
            <Stat label="Deposit bookings" value={String(data.depositBookingsCount)} />
            <Stat label="Assessment" value={String(data.assessmentBookingsCount)} />
            <Stat label="Replacement" value={String(data.replacementBookingsCount)} />
          </View>

          <Text className="text-text font-semibold mt-4 mb-2">Bookings</Text>
          {data.items.length === 0 ? (
            <GoldCard>
              <Text className="text-text-muted">No activity for this day.</Text>
            </GoldCard>
          ) : (
            data.items.map((it) => (
              <GoldCard key={it.bookingId} className="mb-2">
                <View className="flex-row justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-text font-semibold">{it.trackingId ?? it.bookingId.slice(0, 8)}</Text>
                    <Text className="text-text-muted text-xs">
                      {it.customerName ?? 'Customer'} • {it.jobType ?? ''} • {it.status ?? ''}
                    </Text>
                    <Text className="text-text text-xs mt-1">
                      Paid £{it.paidGbp}
                      {it.balanceDueGbp ? ` • Balance due £${it.balanceDueGbp}` : ''}
                    </Text>
                    {it.cancellation ? (
                      <Text className="text-warning text-xs mt-1">
                        Cancellation: {it.cancellation.depositDecision}
                        {it.cancellation.retainedGbp ? ` • retained £${it.cancellation.retainedGbp}` : ''}
                        {it.cancellation.refundDueGbp ? ` • refund review £${it.cancellation.refundDueGbp}` : ''}
                      </Text>
                    ) : null}
                  </View>
                  <View className="gap-1">
                    {onOpenBooking ? (
                      <Pressable
                        onPress={() => onOpenBooking(it.bookingId)}
                        className="rounded-lg bg-surfaceMuted px-3 py-1"
                      >
                        <Text className="text-text text-xs">Open</Text>
                      </Pressable>
                    ) : null}
                    {onSendBalanceLink && it.paymentStatus === 'deposit_paid' ? (
                      <Pressable
                        onPress={() => onSendBalanceLink(it.bookingId)}
                        className="rounded-lg bg-gold px-3 py-1"
                      >
                        <Text className="text-canvas text-xs">Balance link</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </GoldCard>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'purple';
}): React.JSX.Element {
  const colour =
    tone === 'success'
      ? 'text-success'
      : tone === 'warn'
        ? 'text-warning'
        : tone === 'danger'
          ? 'text-danger'
          : tone === 'purple'
            ? 'text-purple-300'
            : 'text-text';
  return (
    <View style={{ width: '50%', padding: 4 }}>
      <View className="rounded-2xl bg-surface border border-border p-3">
        <Text className="text-text-muted text-xs">{label}</Text>
        <Text className={`text-base font-semibold mt-1 ${colour}`}>{value}</Text>
      </View>
    </View>
  );
}
