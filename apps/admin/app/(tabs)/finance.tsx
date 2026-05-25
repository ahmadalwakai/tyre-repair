import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { AdminButton } from '@/components/ui/AdminButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { PricingTodayCard } from '@/components/finance/PricingTodayCard';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import {
  getOutstandingBalances,
  getFailedPayments,
  getDailyClose,
} from '@/lib/api/finance';
import { getCashReconciliation } from '@/lib/api/financial-safety';

interface HubSummary {
  outstandingCount: number | null;
  outstandingTotalGbp: string | null;
  failedCount: number | null;
  cashCollectedGbp: string | null;
  cashFailedCount: number | null;
  closeCollectedGbp: string | null;
  closeCompleted: number | null;
}

const EMPTY: HubSummary = {
  outstandingCount: null,
  outstandingTotalGbp: null,
  failedCount: null,
  cashCollectedGbp: null,
  cashFailedCount: null,
  closeCollectedGbp: null,
  closeCompleted: null,
};

interface HubCardProps {
  title: string;
  description: string;
  metric: string | null;
  metricLabel: string | null;
  href: string;
  delay?: number;
}

function HubCard({
  title,
  description,
  metric,
  metricLabel,
  href,
  delay = 0,
}: HubCardProps): React.JSX.Element {
  return (
    <AnimatedCard delay={delay}>
      <GoldCard className="mb-3">
        <Text className="text-text font-semibold text-base">{title}</Text>
        <Text className="text-text-muted text-xs mt-1">{description}</Text>
        {metric !== null && metric !== '' ? (
          <View className="mt-3">
            <Text className="text-gold text-2xl font-bold">{metric}</Text>
            {metricLabel ? (
              <Text className="text-text-dim text-[11px] uppercase tracking-wide mt-0.5">
                {metricLabel}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text className="text-text-dim text-xs mt-3">No live total available right now.</Text>
        )}
        <View className="mt-4">
          <AdminButton
            label="Open"
            variant="secondary"
            size="md"
            fullWidth
            onPress={() => router.push(href as never)}
          />
        </View>
      </GoldCard>
    </AnimatedCard>
  );
}

export default function FinanceHubScreen(): React.JSX.Element {
  const [summary, setSummary] = useState<HubSummary>(EMPTY);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const [outstanding, failed, cash, close] = await Promise.allSettled([
      getOutstandingBalances(),
      getFailedPayments(),
      getCashReconciliation(),
      getDailyClose(),
    ]);

    setSummary({
      outstandingCount:
        outstanding.status === 'fulfilled' ? outstanding.value.totals.count : null,
      outstandingTotalGbp:
        outstanding.status === 'fulfilled'
          ? outstanding.value.totals.totalOutstandingGbp
          : null,
      failedCount: failed.status === 'fulfilled' ? failed.value.totals.count : null,
      cashCollectedGbp:
        cash.status === 'fulfilled' ? cash.value.collectedTotalGbp : null,
      cashFailedCount:
        cash.status === 'fulfilled' ? cash.value.failedPaymentsCount : null,
      closeCollectedGbp:
        close.status === 'fulfilled' ? close.value.cash.collectedTotalGbp : null,
      closeCompleted:
        close.status === 'fulfilled' ? close.value.operations.completedToday : null,
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <OfflineBanner />
      <ScreenHeader title="Finance" subtitle="Money in, money owed, daily close" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load().finally(() => setRefreshing(false));
            }}
            tintColor="#D4AF37"
          />
        }
      >
        <AnimatedCard delay={0}>
          <PricingTodayCard />
        </AnimatedCard>

        <HubCard
          title="Outstanding balances"
          description="Bookings with deposits paid but balances still owed."
          metric={
            summary.outstandingTotalGbp !== null
              ? `£${summary.outstandingTotalGbp}`
              : null
          }
          metricLabel={
            summary.outstandingCount !== null
              ? `${summary.outstandingCount} open`
              : null
          }
          href="/outstanding-balances"
          delay={0}
        />

        <HubCard
          title="Failed payments"
          description="Card attempts that need follow-up or a retry link."
          metric={summary.failedCount !== null ? String(summary.failedCount) : null}
          metricLabel="Awaiting action"
          href="/failed-payments"
          delay={60}
        />

        <HubCard
          title="Cash reconciliation"
          description="Today's collected totals broken down by payment kind."
          metric={
            summary.cashCollectedGbp !== null ? `£${summary.cashCollectedGbp}` : null
          }
          metricLabel={
            summary.cashFailedCount !== null
              ? `${summary.cashFailedCount} failed`
              : 'Today'
          }
          href="/cash-reconciliation"
          delay={120}
        />

        <HubCard
          title="Daily close"
          description="End-of-day totals, completed jobs and retained deposits."
          metric={
            summary.closeCollectedGbp !== null ? `£${summary.closeCollectedGbp}` : null
          }
          metricLabel={
            summary.closeCompleted !== null
              ? `${summary.closeCompleted} completed`
              : 'Today'
          }
          href="/daily-close"
          delay={180}
        />
      </ScrollView>
    </AppShell>
  );
}
