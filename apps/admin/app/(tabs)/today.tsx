import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { AdminButton } from '@/components/ui/AdminButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { CountUp } from '@/components/ui/CountUp';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { NextBestActionCard } from '@/components/system/NextBestActionCard';
import { PricingTodayCard } from '@/components/finance/PricingTodayCard';
import { ShortcutTiles } from '@/components/system/ShortcutTiles';
import { DemandNowCard } from '@/components/system/DemandNowCard';
import { IncomingLeadsTodayCard } from '@/components/system/IncomingLeadsTodayCard';
import { ExportCsvButton } from '@/components/reports/ExportCsvButton';
import { getToday } from '@/lib/api/today';
import type { TodaySummary } from '@/types/command-center';
import { ApiError } from '@/lib/api/client';

function Stat({ label, value }: { label: string; value: string | number }): React.JSX.Element {
  // Detect numeric or £-prefixed-numeric values so we can animate them.
  let body: React.ReactNode;
  if (typeof value === 'number') {
    body = (
      <CountUp
        to={value}
        duration={700}
        className="text-text font-semibold text-lg mt-1"
      />
    );
  } else if (typeof value === 'string' && /^£-?\d/.test(value)) {
    const num = Number(value.replace(/[^0-9.\-]/g, ''));
    const decimals = value.includes('.') ? 2 : 0;
    body = Number.isFinite(num) ? (
      <CountUp
        to={num}
        duration={700}
        decimals={decimals}
        prefix="£"
        className="text-text font-semibold text-lg mt-1"
      />
    ) : (
      <Text className="text-text font-semibold text-lg mt-1">{value}</Text>
    );
  } else {
    body = <Text className="text-text font-semibold text-lg mt-1">{value}</Text>;
  }
  return (
    <View className="w-1/2 px-1 mb-2">
      <View className="bg-surface rounded-lg p-3 border border-border">
        <Text className="text-text-dim text-[10px] uppercase tracking-wide">{label}</Text>
        {body}
      </View>
    </View>
  );
}

export default function TodayScreen(): React.JSX.Element {
  const [data, setData] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getToday();
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load today summary');
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
      <ScreenHeader title="Today" subtitle={data?.date ?? ''} />
      {loading ? (
        <LoadingState label="Loading today summary…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? null : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
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
          <View className="mb-3">
            <AdminButton
              label="+ New phone booking"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.push('/quick-booking' as never)}
            />
          </View>

          <ShortcutTiles />

          <IncomingLeadsTodayCard />

          <DemandNowCard summary={data} />

          <AnimatedCard delay={0}>
            <NextBestActionCard action={data.nextBestAction ?? null} />
          </AnimatedCard>

          <AnimatedCard delay={40}>
          <GoldCard className="mb-3" tone="info" icon="📅" title="Bookings today">
            <View className="flex-row flex-wrap -mx-1">
              <Stat label="Total" value={data.bookingsToday.total} />
              <Stat label="Pending payment" value={data.bookingsToday.newCount} />
              <Stat label="Confirmed" value={data.bookingsToday.confirmed} />
              <Stat label="Dispatched" value={data.bookingsToday.dispatched} />
              <Stat label="On site" value={data.bookingsToday.onSite} />
              <Stat label="Completed" value={data.bookingsToday.completed} />
              <Stat label="Cancelled" value={data.bookingsToday.cancelled} />
            </View>
          </GoldCard>
          </AnimatedCard>

          {(data.bookingsToday.buyTyres ?? 0) > 0 ||
          (data.bookingsToday.emergency ?? 0) > 0 ? (
            <AnimatedCard delay={60}>
              <GoldCard className="mb-3" tone="gold" icon="🛒" title="Buy Tyres today">
                <View className="flex-row flex-wrap -mx-1">
                  <Stat label="Buy Tyres orders" value={data.bookingsToday.buyTyres ?? 0} />
                  <Stat label="Emergency" value={data.bookingsToday.emergency ?? 0} />
                  <Stat label="Paid today" value={data.bookingsToday.buyTyresPaid ?? 0} />
                  <Stat label="Special orders" value={data.bookingsToday.buyTyresBackorders ?? 0} />
                </View>
              </GoldCard>
            </AnimatedCard>
          ) : null}

          <AnimatedCard delay={80}>
          <GoldCard className="mb-3" tone="success" icon="£" title="Cash today">
            <View className="flex-row flex-wrap -mx-1">
              <Stat label="Collected" value={`£${data.cashToday.collectedTotalGbp}`} />
              <Stat label="Payments" value={data.cashToday.paymentsCount} />
              <Stat label="Full" value={`£${data.cashToday.collectedFullGbp}`} />
              <Stat label="Deposits" value={`£${data.cashToday.collectedDepositsGbp}`} />
              <Stat label="Balance" value={`£${data.cashToday.collectedBalanceGbp}`} />
              <Stat label="Adjustment" value={`£${data.cashToday.collectedAdjustmentGbp}`} />
              <Stat label="Failed" value={data.cashToday.failedPaymentsCount} />
            </View>
          </GoldCard>
          </AnimatedCard>

          <AnimatedCard delay={120}>
          <GoldCard className="mb-3" tone="warning" icon="!" title="Pending action">
            <View className="flex-row flex-wrap -mx-1">
              <Stat label="Payment failed" value={data.pending.paymentFailed} />
              <Stat label="Balance due" value={data.pending.depositBalanceDue} />
              <Stat label="No locking nut key" value={data.pending.noLockingNutKey} />
              <Stat label="Pending adjustments" value={data.pendingAdjustments} />
            </View>
          </GoldCard>
          </AnimatedCard>

          <AnimatedCard delay={130}>
            <PricingTodayCard />
          </AnimatedCard>

          {data.pricingSafety ? (
            <AnimatedCard delay={140}>
            <GoldCard
              className="mb-3"
              tone={
                data.pricingSafety.callFirstBlocksToday > 0 ||
                data.pricingSafety.highRiskToday > 0
                  ? 'gold'
                  : 'warning'
              }
              {...(data.pricingSafety.callFirstBlocksToday > 0
                ? { priority: 'high' as const }
                : {})}
              icon="🛡"
              title="Pricing safety today"
            >
              <View className="flex-row flex-wrap -mx-1">
                <Stat label="Review needed" value={data.pricingSafety.reviewToday} />
                <Stat label="High risk" value={data.pricingSafety.highRiskToday} />
                <Stat
                  label="Call-first blocks"
                  value={data.pricingSafety.callFirstBlocksToday}
                />
                <Stat
                  label="Long-distance assess."
                  value={data.pricingSafety.longDistanceAssessmentsToday}
                />
                <Stat label="Overrides" value={data.pricingSafety.overridesToday} />
                <Stat
                  label="Below-min overrides"
                  value={data.pricingSafety.belowMinimumOverridesToday}
                />
              </View>
            </GoldCard>
            </AnimatedCard>
          ) : null}

          <AnimatedCard delay={160}>
          <GoldCard className="mb-3" tone="info" icon="📞" title="Callbacks">
            <View className="flex-row flex-wrap -mx-1">
              <Stat label="Today total" value={data.callbacks.todayTotal} />
              <Stat label="Today new" value={data.callbacks.todayNew} />
              <Stat label="Open total" value={data.callbacks.openTotal} />
            </View>
          </GoldCard>
          </AnimatedCard>

          {data.emergencyAssist && data.emergencyAssist.todayOpen > 0 ? (
            <AnimatedCard delay={200}>
            <GoldCard className="mb-3" tone="gold" priority="high" icon="🚨" title="Emergency assist">
              <View className="flex-row flex-wrap -mx-1 mb-2">
                <Stat label="Open" value={data.emergencyAssist.todayOpen} />
                <Stat label="Today total" value={data.emergencyAssist.todayTotal} />
              </View>
              <AdminButton
                label="Open action queue"
                variant="primary"
                size="md"
                fullWidth
                onPress={() => router.push('/(tabs)/action-queue' as never)}
              />
            </GoldCard>
            </AnimatedCard>
          ) : null}

          <View className="mt-2 mb-6 flex-row justify-end">
            <ExportCsvButton kind="today" label="Export today (CSV)" />
          </View>
        </ScrollView>
      )}
    </AppShell>
  );
}
