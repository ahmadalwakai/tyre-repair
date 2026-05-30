import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { AdminButton } from '@/components/ui/AdminButton';
import { usePricingTodayReport } from '@/hooks/usePricingTodayReport';
import type { PricingTodayReport } from '@/types/reports';

interface RowProps {
  label: string;
  value: number;
  hint?: string;
  emphasis?: 'normal' | 'warning' | 'danger';
}

function Row({ label, value, hint, emphasis = 'normal' }: RowProps): React.JSX.Element {
  const valueClass =
    emphasis === 'danger'
      ? 'text-danger'
      : emphasis === 'warning' && value > 0
        ? 'text-warning'
        : 'text-text';
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-border/40">
      <View className="flex-1 pr-3">
        <Text className="text-text text-sm">{label}</Text>
        {hint ? (
          <Text className="text-text-dim text-[11px] mt-0.5">{hint}</Text>
        ) : null}
      </View>
      <Text className={`${valueClass} font-semibold text-lg tabular-nums`}>{value}</Text>
    </View>
  );
}

function formatLondonDate(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(dateStr);
  if (!m) return dateStr;
  const y = parseInt(m[1] ?? '0', 10);
  const mo = parseInt(m[2] ?? '0', 10);
  const d = parseInt(m[3] ?? '0', 10);
  try {
    return new Date(Date.UTC(y, mo - 1, d, 12)).toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

function PricingTodayBody({ data }: { data: PricingTodayReport }): React.JSX.Element {
  return (
    <View>
      <Row
        label="Pricing review jobs"
        hint="REVIEW + HIGH_RISK + BLOCK_PUBLIC_PAYMENT"
        value={data.pricingReviewJobsToday}
        emphasis="warning"
      />
      <Row
        label="Public 'call first' blocks"
        hint="Quotes blocked at checkout"
        value={data.publicCallFirstBlocksToday}
        emphasis="warning"
      />
      <Row
        label="Long-distance assessments"
        value={data.longDistanceAssessmentJobsToday}
      />
      <Row
        label="Cash on site (high risk)"
        value={data.cashHighRiskJobsToday}
        emphasis="warning"
      />
      <Row
        label="Overrides applied"
        value={data.overridesAppliedToday}
      />
      <Row
        label="Below recommended minimum"
        hint="Subset of overrides applied"
        value={data.belowMinimumOverridesToday}
        emphasis="danger"
      />
    </View>
  );
}

/**
 * Lightweight "Pricing today" snapshot for the Today / Finance screens.
 * Self-contained: handles its own load/refresh/error states; never blocks
 * the parent screen.
 */
export function PricingTodayCard(): React.JSX.Element {
  const { data, loading, refreshing, error, refetch } = usePricingTodayReport();

  return (
    <GoldCard
      className="mb-3"
      tone="info"
      icon="📊"
      title="Pricing today"
      {...(data ? { eyebrow: formatLondonDate(data.date) } : {})}
    >
      {loading && !data ? (
        <View className="py-6 flex-row items-center justify-center">
          <ActivityIndicator color="#E30613" />
          <Text className="text-text-dim text-sm ml-2">Loading…</Text>
        </View>
      ) : error && !data ? (
        <View className="py-3">
          <Text className="text-danger text-sm mb-2">{error}</Text>
          <AdminButton
            label="Retry"
            variant="secondary"
            size="sm"
            onPress={() => {
              void refetch({ fresh: true });
            }}
          />
        </View>
      ) : data ? (
        <View>
          <PricingTodayBody data={data} />
          <View className="flex-row items-center justify-end mt-2">
            <AdminButton
              label={refreshing ? 'Refreshing…' : 'Refresh'}
              variant="secondary"
              size="sm"
              disabled={refreshing}
              onPress={() => {
                void refetch({ fresh: true });
              }}
            />
          </View>
        </View>
      ) : null}
    </GoldCard>
  );
}
