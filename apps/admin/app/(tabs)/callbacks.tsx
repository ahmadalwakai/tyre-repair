import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, RefreshControl, Text, View } from 'react-native';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { AdminButton } from '@/components/ui/AdminButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { SkeletonCardList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { formatUkPhoneForDisplay } from '@/lib/format/labels';
import {
  listCallbackRequests,
  updateCallbackRequestStatus,
  type CallbackRequest,
  type CallbackRequestStatus,
} from '@/lib/api/callback-requests';
import { ApiError } from '@/lib/api/client';

const STATUS_LABEL: Record<CallbackRequestStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  converted: 'Converted',
  closed: 'Closed',
};

function CallbackRow({
  item,
  onUpdate,
}: {
  item: CallbackRequest;
  onUpdate: (id: string, status: CallbackRequestStatus) => Promise<void>;
}): React.JSX.Element {
  const created = new Date(item.createdAt);
  const tone =
    item.status === 'new'
      ? 'gold'
      : item.status === 'contacted'
        ? 'info'
        : item.status === 'converted'
          ? 'success'
          : 'default';
  return (
    <GoldCard
      className="mb-3"
      tone={tone}
      priority={item.status === 'new' ? 'high' : 'normal'}
      icon="📞"
      eyebrow={formatUkPhoneForDisplay(item.phone)}
      title={item.fullName ?? 'Anonymous caller'}
      headerRight={
        <View className="rounded-full bg-surfaceMuted px-2 py-1">
          <Text className="text-text-muted text-[10px] uppercase tracking-wide">
            {STATUS_LABEL[item.status]}
          </Text>
        </View>
      }
    >
      {item.email ? (
        <Text className="text-text-muted text-xs">{item.email}</Text>
      ) : null}
      {item.tyreProblemType ? (
        <Text className="text-text-muted text-xs mt-2">
          Issue: {item.tyreProblemType.replace(/_/g, ' ').toLowerCase()}
        </Text>
      ) : null}
      {item.locationLabel ? (
        <Text className="text-text-muted text-xs mt-1">Location: {item.locationLabel}</Text>
      ) : null}
      {item.latitude != null && item.longitude != null ? (
        <Text className="text-text-dim text-[10px] mt-0.5">
          GPS: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
        </Text>
      ) : null}
      {item.message ? <Text className="text-text mt-2">{item.message}</Text> : null}
      {item.source ? (
        <Text className="text-text-dim text-xs mt-1">Source: {item.source}</Text>
      ) : item.sourcePage ? (
        <Text className="text-text-dim text-xs mt-1">From: {item.sourcePage}</Text>
      ) : null}
      <Text className="text-text-dim text-xs mt-1">{created.toLocaleString()}</Text>

      <View className="flex-row mt-3 gap-2 flex-wrap">
        <AdminButton
          label="Call"
          variant="primary"
          size="sm"
          onPress={() => {
            void Linking.openURL(`tel:${item.phone}`);
          }}
        />
        <AdminButton
          label="WhatsApp"
          variant="whatsapp"
          size="sm"
          onPress={() => {
            const cleaned = item.phone.replace(/[^\d+]/g, '');
            void Linking.openURL(`https://wa.me/${cleaned}`);
          }}
        />
        {item.status === 'new' ? (
          <AdminButton
            label="Mark contacted"
            variant="secondary"
            size="sm"
            onPress={() => {
              void onUpdate(item.id, 'contacted');
            }}
          />
        ) : null}
        {item.status !== 'converted' ? (
          <AdminButton
            label="Converted"
            variant="success"
            size="sm"
            onPress={() => {
              void onUpdate(item.id, 'converted');
            }}
          />
        ) : null}
        {item.status !== 'closed' ? (
          <AdminButton
            label="Close"
            variant="subtle"
            size="sm"
            onPress={() => {
              void onUpdate(item.id, 'closed');
            }}
          />
        ) : null}
      </View>
    </GoldCard>
  );
}

export default function CallbacksScreen(): React.JSX.Element {
  const [items, setItems] = useState<CallbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listCallbackRequests(100);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load call-back requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      void load();
    }, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const onUpdate = useCallback(
    async (id: string, status: CallbackRequestStatus) => {
      try {
        await updateCallbackRequestStatus(id, status);
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, status } : it)),
        );
        toast.success(`Marked as ${STATUS_LABEL[status]}`);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : 'Could not update status');
      }
    },
    [toast],
  );

  if (loading) {
    return (
      <AppShell>
        <ScreenHeader title="Call-back Requests" />
        <SkeletonCardList count={4} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScreenHeader
        title="Call-back Requests"
        subtitle={`${items.filter((i) => i.status === 'new').length} new`}
      />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          message="No call-back requests yet. They'll appear here as soon as a customer fills in the form."
          action={{ label: 'Refresh', onPress: load, variant: 'secondary' }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={({ item, index }) => (
            <AnimatedCard delay={Math.min(index, 5) * 30} disabled={index > 8}>
              <CallbackRow item={item} onUpdate={onUpdate} />
            </AnimatedCard>
          )}
          contentContainerStyle={{ padding: 16 }}
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
        />
      )}
    </AppShell>
  );
}
