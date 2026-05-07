import React from 'react';
import { View } from 'react-native';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { AuditLogList } from '@/components/audit/AuditLogList';

export default function AuditScreen(): React.JSX.Element {
  return (
    <AppShell>
      <ScreenHeader title="Audit Log" subtitle="All sensitive admin and system actions" />
      <View className="flex-1 px-3">
        <AuditLogList />
      </View>
    </AppShell>
  );
}
