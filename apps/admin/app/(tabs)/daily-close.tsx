import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { getDailyClose, type DailyCloseResponse } from '@/lib/api/finance';
import { ApiError } from '@/lib/api/client';

function Stat({ label, value }: { label: string; value: string | number }): React.JSX.Element {
  return (
    <View className="w-1/2 px-1 mb-2">
      <View className="bg-surface rounded-lg p-3 border border-border">
        <Text className="text-text-dim text-[10px] uppercase tracking-wide">{label}</Text>
        <Text className="text-text font-semibold text-lg mt-1">{value}</Text>
      </View>
    </View>
  );
}

export default function DailyCloseScreen(): React.JSX.Element {
  const [data, setData] = useState<DailyCloseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getDailyClose();
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load daily close');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <OfflineBanner />
      <ScreenHeader title="Daily close" subtitle={data?.date ?? ''} />
      {loading ? (
        <LoadingState label="Loading daily close…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? null : (
        <ScrollView
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor="#E30613"
            />
          }
        >
          <GoldCard className="mb-3">
            <Text className="text-text font-semibold mb-2">Cash</Text>
            <View className="flex-row flex-wrap -mx-1">
              <Stat label="Total" value={`£${data.cash.collectedTotalGbp}`} />
              <Stat label="Payments" value={data.cash.paymentsCount} />
              <Stat label="Full" value={`£${data.cash.collectedFullGbp}`} />
              <Stat label="Deposits" value={`£${data.cash.collectedDepositGbp}`} />
              <Stat label="Balance" value={`£${data.cash.collectedBalanceGbp}`} />
              <Stat label="Adjustment" value={`£${data.cash.collectedAdjustmentGbp}`} />
              <Stat label="Failed today" value={data.cash.failedCount} />
            </View>
          </GoldCard>

          <GoldCard className="mb-3">
            <Text className="text-text font-semibold mb-2">Operations</Text>
            <View className="flex-row flex-wrap -mx-1">
              <Stat label="Completed today" value={data.operations.completedToday} />
              <Stat label="Cancelled today" value={data.operations.cancelledToday} />
              <Stat label="Deposits retained" value={data.operations.depositRetainedCount} />
              <Stat label="Retained total" value={`£${data.operations.depositRetainedTotalGbp}`} />
            </View>
          </GoldCard>

          <GoldCard className="mb-3">
            <Text className="text-text font-semibold mb-2">Successful payments</Text>
            {data.payments.length === 0 ? (
              <Text className="text-text-muted">No payments recorded today.</Text>
            ) : (
              data.payments.map((p) => (
                <View key={p.id} className="flex-row justify-between py-1.5 border-b border-border">
                  <View className="flex-1 pr-3">
                    <Text className="text-text">{p.trackingId ?? '—'}</Text>
                    <Text className="text-text-dim text-xs">
                      {p.customerName ?? 'Customer'} · {p.kind}
                    </Text>
                  </View>
                  <Text className="text-success font-semibold">£{p.amountGbp}</Text>
                </View>
              ))
            )}
          </GoldCard>
        </ScrollView>
      )}
    </AppShell>
  );
}
