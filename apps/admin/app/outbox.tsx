import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { AdminButton } from '@/components/ui/AdminButton';
import { AdminIcon } from '@/components/ui/AdminIcon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useToast } from '@/components/ui/Toast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  flushOutbox,
  getOutboxItems,
  discardOutboxItem,
  type OutboxItem,
} from '@/lib/offline/outbox';

function BackButton(): React.JSX.Element {
  const goBack = (): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more' as never);
    }
  };
  return (
    <Pressable
      onPress={goBack}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={12}
      android_ripple={{ color: 'rgba(212,175,55,0.15)', borderless: true }}
      className="flex-row items-center px-3 py-2 mr-1 rounded-md"
    >
      <AdminIcon name="chevron-left" size={20} color="#E30613" />
      <Text className="text-gold text-base ml-1">Back</Text>
    </Pressable>
  );
}

/**
 * Admin Stability & Field Operations Pack — Part 2
 * Outbox screen — lists pending safe actions, allows retry / discard.
 *
 * Dangerous actions are NEVER shown here because they are never queued.
 */
export default function OutboxScreen(): React.JSX.Element {
  const { online } = useNetworkStatus();
  const toast = useToast();
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    const list = await getOutboxItems();
    setItems(list);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Auto-flush when we come online.
  useEffect(() => {
    if (!online) return;
    if (items.length === 0) return;
    let cancelled = false;
    void (async () => {
      const res = await flushOutbox();
      if (cancelled) return;
      if (res.succeeded > 0) {
        toast.show(`Sent ${res.succeeded} pending action(s).`, 'success');
      }
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [online, items.length, refresh, toast]);

  const onRetry = useCallback(async (): Promise<void> => {
    if (!online) {
      toast.show('Internet required to retry.', 'warning');
      return;
    }
    setBusy(true);
    try {
      const res = await flushOutbox();
      toast.show(
        `Attempted ${res.attempted} • sent ${res.succeeded} • failed ${res.failed}`,
        res.failed === 0 ? 'success' : 'warning',
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [online, refresh, toast]);

  const onDiscard = useCallback(
    async (id: string): Promise<void> => {
      await discardOutboxItem(id);
      await refresh();
    },
    [refresh],
  );

  return (
    <AppShell>
      <OfflineBanner />
      <View className="flex-row items-center pt-2">
        <BackButton />
        <View className="flex-1">
          <ScreenHeader
            title="Outbox"
            subtitle="Pending safe actions waiting to send"
          />
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
        <AnimatedCard>
          <View className="bg-surface rounded-xl border border-border p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-text font-semibold">Pending: {items.length}</Text>
              <StatusBadge tone={online ? 'success' : 'danger'} label={online ? 'Online' : 'Offline'} />
            </View>
            <Text className="text-text-muted text-xs mb-3">
              Only safe actions are queued (notes, mark-as-read). Booking,
              payment and stock actions require an internet connection and are
              never queued.
            </Text>
            <AdminButton
              label={busy ? 'Retrying…' : 'Retry now'}
              variant="primary"
              size="sm"
              loading={busy}
              disabled={busy || items.length === 0 || !online}
              onPress={onRetry}
            />
          </View>
        </AnimatedCard>

        {items.length === 0 ? (
          <View className="items-center py-10">
            <Text className="text-text-muted text-sm">No pending actions.</Text>
          </View>
        ) : (
          items.map((item) => (
            <AnimatedCard key={item.id}>
              <View className="bg-surface rounded-xl border border-border p-3 mb-2">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-text font-semibold flex-1 pr-2" numberOfLines={1}>
                    {item.label}
                  </Text>
                  <StatusBadge
                    tone={
                      item.status === 'failed'
                        ? 'danger'
                        : item.status === 'retrying'
                          ? 'warning'
                          : 'info'
                    }
                    label={item.status}
                  />
                </View>
                <Text className="text-text-muted text-xs">
                  {item.type} • {new Date(item.createdAt).toLocaleString()} • retries {item.retryCount}
                </Text>
                {item.lastError ? (
                  <Text className="text-danger text-xs mt-1" numberOfLines={2}>
                    {item.lastError}
                  </Text>
                ) : null}
                <View className="mt-2">
                  <AdminButton
                    label="Discard"
                    variant="ghost"
                    size="sm"
                    onPress={() => void onDiscard(item.id)}
                  />
                </View>
              </View>
            </AnimatedCard>
          ))
        )}
      </ScrollView>
    </AppShell>
  );
}
