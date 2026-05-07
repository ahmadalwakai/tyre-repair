import React from 'react';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { CashReconciliationScreen } from '@/components/reports/CashReconciliationScreen';

export default function CashRecon(): React.JSX.Element {
  return (
    <AppShell>
      <ScreenHeader title="Cash Reconciliation" subtitle="Daily totals — succeeded payments only" />
      <CashReconciliationScreen />
    </AppShell>
  );
}
