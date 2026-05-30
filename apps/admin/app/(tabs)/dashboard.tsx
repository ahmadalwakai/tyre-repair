import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { ErrorState } from '@/components/ui/States';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { getDashboardSummary } from '@/lib/api/dashboard';
import { qk } from '@/lib/query/keys';
import { useRefresh } from '@/hooks/useRefresh';
import { ApiError } from '@/lib/api/client';

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }): React.JSX.Element {
  return (
    <GoldCard className="flex-1 mr-2">
      <Text className="text-text-dim text-xs">{label}</Text>
      <Text className="text-gold text-2xl font-bold mt-1">{value}</Text>
      {hint ? <Text className="text-text-muted text-xs mt-1">{hint}</Text> : null}
    </GoldCard>
  );
}

export default function DashboardScreen(): React.JSX.Element {
  const query = useQuery({
    queryKey: qk.dashboard(),
    queryFn: ({ signal }) => getDashboardSummary(signal),
  });
  const { refreshControl } = useRefresh(() => query.refetch());

  if (query.isLoading) {
    return (
      <AppShell>
        <ScreenHeader title="Dashboard" />
        <DashboardSkeleton />
      </AppShell>
    );
  }
  const summary = query.data;
  if (query.isError || !summary) {
    const message =
      query.error instanceof ApiError ? query.error.message : 'Could not load dashboard';
    return (
      <AppShell>
        <ScreenHeader title="Dashboard" />
        <ErrorState message={message} onRetry={() => void query.refetch()} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScreenHeader title="Dashboard" subtitle={new Date(summary.generatedAt).toLocaleString()} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={refreshControl}
      >
        <View className="flex-row">
          <MetricCard label="Today revenue" value={`£${summary.today.revenueGbp}`} hint={`${summary.today.payments} payments`} />
          <MetricCard label="Today bookings" value={String(summary.today.bookings)} />
        </View>
        <View className="flex-row">
          <MetricCard label="Week revenue" value={`£${summary.week.revenueGbp}`} hint={`${summary.week.payments} payments`} />
          <MetricCard label="Week bookings" value={String(summary.week.bookings)} />
        </View>
        <View className="flex-row">
          <MetricCard label="Open" value={String(summary.bookings.open)} />
          <MetricCard label="Completed" value={String(summary.bookings.completed)} />
          <MetricCard label="Cancelled" value={String(summary.bookings.cancelled)} />
        </View>
        <GoldCard>
          <Text className="text-text font-semibold mb-2">Top tyres (7d)</Text>
          {summary.topTyres.length === 0 ? (
            <Text className="text-text-muted">No bookings yet.</Text>
          ) : (
            summary.topTyres.map((t) => (
              <View key={t.tyreId} className="flex-row justify-between py-1 border-b border-border">
                <Text className="text-text flex-1">
                  {t.brand} {t.model} {t.sizeLabel}
                </Text>
                <Text className="text-gold font-semibold">{t.bookings}</Text>
              </View>
            ))
          )}
        </GoldCard>
        <GoldCard>
          <Text className="text-text-muted">Active overrides: {summary.pricing.activeOverrides}</Text>
        </GoldCard>
      </ScrollView>
    </AppShell>
  );
}
