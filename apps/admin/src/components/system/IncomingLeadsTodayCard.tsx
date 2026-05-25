import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useNotifications } from '@/context/NotificationProvider';
import { AdminButton } from '@/components/ui/AdminButton';
import type { IncomingLeadType } from '@/types/incoming-leads';

const TYPE_LABEL: Record<IncomingLeadType, string> = {
  CALL_CLICK: 'Website call',
  EMERGENCY_ASSIST: 'Emergency assist',
  CALLBACK_REQUEST: 'Callback request',
};

/**
 * Lightweight Today-screen tile that surfaces the unified incoming-leads
 * queue without waiting for a popup to appear.
 *
 * Always shows total waiting + in-progress counts so the admin knows nothing
 * has been missed, even after dismissing the alert popup.
 */
export function IncomingLeadsTodayCard(): React.JSX.Element {
  const { incomingLeads, queueCount, activeLead } = useNotifications();
  const inProgressCount = incomingLeads.filter((l) => l.status === 'IN_PROGRESS').length;
  const waitingCount = (activeLead ? 1 : 0) + queueCount;
  const latestType = activeLead ? TYPE_LABEL[activeLead.type] : null;
  const isEmpty = waitingCount === 0 && inProgressCount === 0;

  return (
    <View className="bg-surface border border-border rounded-xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-text font-semibold text-base">Incoming leads</Text>
        {!isEmpty ? (
          <Text className="text-gold text-xs font-semibold">
            {waitingCount} waiting · {inProgressCount} in progress
          </Text>
        ) : null}
      </View>
      {isEmpty ? (
        <Text className="text-text-muted text-xs mb-3">No incoming leads waiting.</Text>
      ) : (
        <Text className="text-text-dim text-xs mb-3">
          {latestType ? `Latest: ${latestType}` : 'Open the leads screen to handle them.'}
        </Text>
      )}
      <AdminButton
        label="Open leads"
        variant={isEmpty ? 'subtle' : 'primary'}
        size="sm"
        fullWidth
        onPress={() => router.push('/incoming-leads' as never)}
      />
    </View>
  );
}
