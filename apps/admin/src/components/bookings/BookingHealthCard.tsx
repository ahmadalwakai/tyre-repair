import React from 'react';
import { Text, View } from 'react-native';
import { GoldCard, type GoldCardTone } from '@/components/ui/GoldCard';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import type { BookingHealthScoreSummary } from '@/types/bookings';

/**
 * Admin Efficiency Pack F2 — Booking health card.
 * Renders the health score returned by /api/admin/bookings/:id.
 */
export function BookingHealthCard({
  health,
}: {
  health: BookingHealthScoreSummary | undefined;
}): React.JSX.Element | null {
  if (!health) return null;

  const tone: GoldCardTone =
    health.severity === 'DANGER'
      ? 'danger'
      : health.severity === 'WARNING'
        ? 'warning'
        : health.severity === 'INFO'
          ? 'info'
          : 'success';
  const valueColor =
    tone === 'danger'
      ? 'text-danger'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'info'
          ? 'text-text-muted'
          : 'text-success';
  const barColor =
    tone === 'danger'
      ? 'bg-danger'
      : tone === 'warning'
        ? 'bg-warning'
        : tone === 'info'
          ? 'bg-text-dim'
          : 'bg-success';
  const icon =
    tone === 'danger' ? '⚠' : tone === 'warning' ? '!' : tone === 'info' ? 'ℹ' : '✓';
  const score = Math.max(0, Math.min(100, Math.round(health.score)));

  return (
    <AnimatedCard>
      <GoldCard
        className="mb-3"
        tone={tone}
        priority={tone === 'danger' ? 'high' : 'normal'}
        icon={icon}
        eyebrow="Booking health"
        title={health.title}
        headerRight={
          <View className="items-end">
            <Text className={`font-bold text-3xl ${valueColor}`}>{score}</Text>
            <Text className="text-text-dim text-[10px]">/ 100</Text>
          </View>
        }
      >
        <View className="h-1.5 bg-surfaceMuted rounded-full overflow-hidden">
          <View className={`h-full ${barColor}`} style={{ width: `${score}%` }} />
        </View>
        {health.message ? (
          <Text className="text-text-muted text-xs mt-3">{health.message}</Text>
        ) : null}
        {health.missingItems.length > 0 ? (
          <View className="mt-3">
            <Text className="text-text-dim text-[10px] uppercase tracking-wide mb-1">
              Missing
            </Text>
            {health.missingItems.map((m, i) => (
              <Text key={`m-${i}`} className="text-text text-xs">
                • {m}
              </Text>
            ))}
          </View>
        ) : null}
        {health.recommendedActions.length > 0 ? (
          <View className="mt-3">
            <Text className="text-text-dim text-[10px] uppercase tracking-wide mb-1">
              Suggested next steps
            </Text>
            {health.recommendedActions.map((a, i) => (
              <Text key={`a-${i}`} className="text-text text-xs">
                → {a}
              </Text>
            ))}
          </View>
        ) : null}
      </GoldCard>
    </AnimatedCard>
  );
}
