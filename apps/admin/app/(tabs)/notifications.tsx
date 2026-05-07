import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useToast } from '@/components/ui/Toast';
import { SkeletonCardList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import {
  getInbox,
  markAllRead,
  markHandled,
  markRead,
  type InboxFilter,
} from '@/lib/api/notifications-inbox';
import type { AdminNotification, NotificationInboxResponse, InboxFilterType } from '@/types/notifications';
import { ApiError } from '@/lib/api/client';

const TYPE_TABS: { id: 'all' | InboxFilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'booking', label: 'Booking' },
  { id: 'payment', label: 'Payment' },
  { id: 'stock', label: 'Stock' },
  { id: 'callback', label: 'Callback' },
  { id: 'system', label: 'System' },
];

function NotificationRow({
  item,
  onRead,
  onHandled,
}: {
  item: AdminNotification;
  onRead: (id: string) => Promise<void>;
  onHandled: (id: string) => Promise<void>;
}): React.JSX.Element {
  const created = new Date(item.createdAt);
  return (
    <Pressable
      onPress={() => {
        if (!item.readAt) void onRead(item.id);
        if (item.bookingId) {
          router.push(`/bookings/${item.bookingId}` as never);
        }
      }}
    >
      <GoldCard className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text
              className={`text-[10px] uppercase tracking-wide ${item.priority === 'high' ? 'text-danger' : 'text-text-dim'}`}
            >
              {item.priority === 'high' ? 'HIGH' : 'NORMAL'} · {item.type}
            </Text>
            <Text className="text-text font-semibold mt-1">{item.title}</Text>
            <Text className="text-text-muted mt-1">{item.body}</Text>
            <Text className="text-text-dim text-xs mt-1">{created.toLocaleString()}</Text>
          </View>
          {item.readAt ? null : <View className="w-2 h-2 rounded-full bg-gold" />}
        </View>
        {item.handledAt ? (
          <Text className="text-success text-xs mt-2">Handled</Text>
        ) : (
          <View className="flex-row gap-2 mt-3">
            <GoldButton
              label="Mark handled"
              variant="primary"
              onPress={() => {
                void onHandled(item.id);
              }}
            />
          </View>
        )}
      </GoldCard>
    </Pressable>
  );
}

export default function NotificationInboxScreen(): React.JSX.Element {
  const toast = useToast();
  const [data, setData] = useState<NotificationInboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | InboxFilterType>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [highPriorityOnly, setHighPriorityOnly] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const filter: InboxFilter = { handled: false, limit: 100 };
    if (activeTab !== 'all') filter.type = activeTab;
    if (unreadOnly) filter.unread = true;
    if (highPriorityOnly) filter.highPriority = true;
    try {
      const res = await getInbox(filter);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, unreadOnly, highPriorityOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRead = useCallback(async (id: string) => {
    try {
      await markRead(id);
      void load();
    } catch {
      // ignore
    }
  }, [load]);

  const handleHandled = useCallback(async (id: string) => {
    try {
      await markHandled(id);
      void load();
    } catch {
      // ignore
    }
  }, [load]);

  return (
    <AppShell>
      <OfflineBanner />
      <ScreenHeader
        title="Notifications"
        subtitle={
          data
            ? `${data.counts.unread} unread · ${data.counts.highPriorityUnread} high priority`
            : ''
        }
      />

      <View className="flex-row flex-wrap gap-2 px-3 pb-2">
        {TYPE_TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setActiveTab(t.id)}
            className={`px-3 py-1 rounded-full border ${activeTab === t.id ? 'bg-gold border-gold' : 'border-border'}`}
          >
            <Text className={activeTab === t.id ? 'text-canvas font-semibold' : 'text-text-muted'}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-row gap-2 px-3 pb-2">
        <Pressable
          onPress={() => setUnreadOnly((v) => !v)}
          className={`px-3 py-1 rounded-full border ${unreadOnly ? 'bg-gold border-gold' : 'border-border'}`}
        >
          <Text className={unreadOnly ? 'text-canvas font-semibold' : 'text-text-muted'}>Unread</Text>
        </Pressable>
        <Pressable
          onPress={() => setHighPriorityOnly((v) => !v)}
          className={`px-3 py-1 rounded-full border ${highPriorityOnly ? 'bg-danger border-danger' : 'border-border'}`}
        >
          <Text className={highPriorityOnly ? 'text-canvas font-semibold' : 'text-text-muted'}>High priority</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <GoldButton
          label="Mark all read"
          variant="secondary"
          onPress={() => {
            void (async () => {
              try {
                await markAllRead();
                toast.success('All notifications marked as read');
                void load();
              } catch {
                toast.error('Could not mark all as read');
              }
            })();
          }}
        />
      </View>

      {loading ? (
        <SkeletonCardList count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data || data.notifications.length === 0 ? (
        <EmptyState
          message="No notifications right now."
          action={{ label: 'Refresh', onPress: load, variant: 'secondary' }}
        />
      ) : (
        <FlatList
          data={data.notifications}
          keyExtractor={(i) => i.id}
          renderItem={({ item, index }) => (
            <AnimatedCard delay={Math.min(index, 5) * 25} disabled={index > 8}>
              <NotificationRow item={item} onRead={handleRead} onHandled={handleHandled} />
            </AnimatedCard>
          )}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor="#D4AF37"
            />
          }
        />
      )}
    </AppShell>
  );
}
