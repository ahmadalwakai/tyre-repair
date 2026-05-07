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
  getOutstandingBalances,
  type OutstandingBalanceItem,
  type OutstandingBalancesResponse,
} from '@/lib/api/finance';
import { ApiError } from '@/lib/api/client';

function Row({ item }: { item: OutstandingBalanceItem }): React.JSX.Element {
  return (
    <GoldCard
      className="mb-3"
      tone="warning"
      icon="£"
      eyebrow={item.trackingId}
      title={item.customerName ?? 'Customer'}
      headerRight={
        <View className="items-end">
          <Text className="text-warning font-bold text-2xl">£{item.balanceDueGbp}</Text>
          <Text className="text-text-dim text-[10px]">balance due</Text>
        </View>
      }
    >
      <Text className="text-text-muted text-xs">
        {item.customerPhone ?? '—'} · Deposit £{item.depositAmountGbp} · {item.jobType}
      </Text>
      <View className="flex-row gap-2 mt-3">
        <GoldButton
          label="Open booking"
          variant="primary"
          onPress={() => router.push(`/bookings/${item.bookingId}` as never)}
        />
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

export default function OutstandingBalancesScreen(): React.JSX.Element {
  const [data, setData] = useState<OutstandingBalancesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getOutstandingBalances();
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load outstanding balances');
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
      <ScreenHeader
        title="Outstanding balances"
        subtitle={
          data ? `${data.totals.count} bookings · £${data.totals.totalOutstandingGbp}` : ''
        }
      />
      {loading ? (
        <SkeletonCardList count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          message="No outstanding balances right now."
          action={{ label: 'View finance', onPress: () => router.push('/finance' as never) }}
        />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(i) => i.bookingId}
          renderItem={({ item }) => <Row item={item} />}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor="#D4AF37"
            />
          }
        />
      )}
    </AppShell>
  );
}
