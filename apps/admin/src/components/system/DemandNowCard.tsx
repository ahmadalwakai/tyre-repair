import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import type { TodaySummary } from '@/types/command-center';

type DemandLevel = 'NORMAL' | 'BUSY' | 'VERY_BUSY';

interface DemandSignals {
  bookingsToday: number;
  pendingPayment: number;
  callbacksOpen: number;
  emergencyOpen: number;
  pricingHighRisk: number;
}

function computeLevel(s: DemandSignals): DemandLevel {
  // Simple, transparent heuristic. Tweak thresholds in one place.
  const score =
    Math.min(s.bookingsToday, 20) * 1 +
    Math.min(s.pendingPayment, 10) * 2 +
    Math.min(s.callbacksOpen, 10) * 2 +
    s.emergencyOpen * 5 +
    s.pricingHighRisk * 3;
  if (score >= 30) return 'VERY_BUSY';
  if (score >= 15) return 'BUSY';
  return 'NORMAL';
}

function levelColor(level: DemandLevel): 'success' | 'warning' | 'gold' {
  if (level === 'VERY_BUSY') return 'gold';
  if (level === 'BUSY') return 'warning';
  return 'success';
}

function levelLabel(level: DemandLevel): string {
  if (level === 'VERY_BUSY') return 'Very busy';
  if (level === 'BUSY') return 'Busy';
  return 'Normal';
}

/**
 * Demand right now — a small honest snapshot derived only from existing
 * Today summary data. No fake demand, no map heatmap, no AI.
 */
export function DemandNowCard({
  summary,
}: {
  summary: TodaySummary | null;
}): React.JSX.Element | null {
  const signals: DemandSignals | null = useMemo(() => {
    if (!summary) return null;
    return {
      bookingsToday: summary.bookingsToday.total ?? 0,
      pendingPayment: summary.pending.paymentFailed ?? 0,
      callbacksOpen: summary.callbacks.openTotal ?? 0,
      emergencyOpen: summary.emergencyAssist?.todayOpen ?? 0,
      pricingHighRisk:
        (summary.pricingSafety?.highRiskToday ?? 0) +
        (summary.pricingSafety?.callFirstBlocksToday ?? 0),
    };
  }, [summary]);

  if (!signals) return null;
  const level = computeLevel(signals);

  return (
    <GoldCard className="mb-3" tone={levelColor(level)} icon="📈" title="Demand right now">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-text font-semibold text-base">{levelLabel(level)}</Text>
        <Text className="text-text-dim text-[11px]">Live snapshot</Text>
      </View>
      <View className="flex-row flex-wrap -mx-1">
        <DemandStat label="Bookings today" value={signals.bookingsToday} />
        <DemandStat label="Open emergencies" value={signals.emergencyOpen} />
        <DemandStat label="Open callbacks" value={signals.callbacksOpen} />
        <DemandStat label="Pricing high-risk" value={signals.pricingHighRisk} />
      </View>
    </GoldCard>
  );
}

function DemandStat({
  label,
  value,
}: {
  label: string;
  value: number;
}): React.JSX.Element {
  return (
    <View className="w-1/2 px-1 mb-2">
      <View className="bg-surface rounded-lg p-2 border border-border">
        <Text className="text-text-dim text-[10px] uppercase tracking-wide">{label}</Text>
        <Text className="text-text font-semibold text-lg mt-0.5">{value}</Text>
      </View>
    </View>
  );
}
