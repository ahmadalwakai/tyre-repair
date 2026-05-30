import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { SkeletonCardList } from '@/components/ui/Skeleton';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import {
  getFailedPayments,
  type FailedPaymentItem,
  type FailedPaymentsResponse,
} from '@/lib/api/finance';
import { ApiError } from '@/lib/api/client';

function Row({ item }: { item: FailedPaymentItem }): React.JSX.Element {
  const failed = new Date(item.failedAt ?? item.createdAt);
  return (
    <GoldCard
      className="mb-3"
      tone="danger"
      icon="⚠"
      eyebrow={item.trackingId ?? 'PAYMENT FAILED'}
      title={item.customerName ?? 'Customer'}
      headerRight={
        <View className="items-end">
          <Text className="text-danger font-bold text-2xl">£{item.amountGbp}</Text>
          <Text className="text-text-dim text-[10px]">{item.kind}</Text>
        </View>
      }
    >
      <Text className="text-text-muted text-xs">
        {item.customerPhone ?? '—'} · failed {failed.toLocaleString()}
      </Text>
      <View className="flex-row gap-2 mt-3">
        {item.bookingId ? (
          <GoldButton
            label="Open booking"
            variant="primary"
            onPress={() => router.push(`/bookings/${item.bookingId}` as never)}
          />
        ) : null}
        {item.customerPhone ? (
          <GoldButton
            label="Call"
            variant="secondary"
            onPress={() => {
              void Linking.openURL(`tel:${item.customerPhone!}`);
            }}
          />
        ) : null}
      </View>
    </GoldCard>
  );
}

export default function FailedPaymentsScreen(): React.JSX.Element {
  const [data, setData] = useState<FailedPaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getFailedPayments();
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load failed payments');
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
      <ScreenHeader title="Failed payments" subtitle={data ? `${data.totals.count} failed` : ''} />
      {loading ? (
        <SkeletonCardList count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          message="No failed payments right now."
          action={{ label: 'Refresh', onPress: load, variant: 'secondary' }}
        />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(i) => i.paymentId}
          renderItem={({ item }) => <Row item={item} />}
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
        />
      )}
    </AppShell>
  );
}
