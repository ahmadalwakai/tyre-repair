import React from 'react';
import { Text, View } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import type { AdminPaymentRiskSummary } from '@/types/payments';

const SEVERITY_COLOR: Record<AdminPaymentRiskSummary['severity'], string> = {
  SAFE: 'text-success',
  WARNING: 'text-warning',
  DANGER: 'text-danger',
};

export function PaymentRiskCard({
  risk,
}: {
  risk: AdminPaymentRiskSummary | null;
}): React.JSX.Element | null {
  if (!risk) return null;
  return (
    <AnimatedCard>
      <GoldCard className="mb-3">
        <Text className={`text-xs uppercase tracking-wide ${SEVERITY_COLOR[risk.severity]}`}>
          {risk.severity}
        </Text>
        <Text className="text-text font-semibold text-base mt-1">{risk.title}</Text>
        <Text className="text-text-muted mt-1">{risk.message}</Text>

        <View className="flex-row flex-wrap mt-3 gap-x-6 gap-y-2">
          <Field label="Paid" value={`£${risk.paidAmountGbp}`} />
          <Field label="Balance due" value={`£${risk.balanceDueGbp}`} />
          <Field label="Deposit" value={`£${risk.depositAmountGbp}`} />
          <Field label="Adjustment due" value={`£${risk.adjustmentDueGbp}`} />
        </View>

        <Text className="text-text-dim text-xs mt-3">{risk.stockDecrementExplanation}</Text>
      </GoldCard>
    </AnimatedCard>
  );
}

function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View>
      <Text className="text-text-dim text-[10px] uppercase tracking-wide">{label}</Text>
      <Text className="text-text font-semibold mt-0.5">{value}</Text>
    </View>
  );
}
