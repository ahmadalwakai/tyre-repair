import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { getDashboardSummary } from '@/lib/api/dashboard';
import type { DashboardSummary } from '@/types/dashboard';
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
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await getDashboardSummary();
      setSummary(s);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <AppShell>
        <ScreenHeader title="Dashboard" />
        <LoadingState />
      </AppShell>
    );
  }
  if (error || !summary) {
    return (
      <AppShell>
        <ScreenHeader title="Dashboard" />
        <ErrorState message={error ?? 'Empty'} onRetry={load} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScreenHeader title="Dashboard" subtitle={new Date(summary.generatedAt).toLocaleString()} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
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
