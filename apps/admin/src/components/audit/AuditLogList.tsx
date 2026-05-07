import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { listAuditLogs, type AuditLogItem } from '@/lib/api/financial-safety';
import { ApiError } from '@/lib/api/client';

interface AuditLogListProps {
  bookingId?: string;
  entityType?: string;
  pageSize?: number;
  showFilters?: boolean;
}

function actorLabel(item: AuditLogItem): string {
  if (item.actorLabel) return item.actorLabel;
  switch (item.actorType) {
    case 'system':
      return 'System';
    case 'stripe_webhook':
      return 'Stripe webhook';
    case 'customer':
      return 'Customer';
    case 'pusher':
      return 'Realtime';
    case 'notification':
      return 'Notifications';
    case 'admin':
      return 'Admin';
    default:
      return item.actorType;
  }
}

function shortSummary(item: AuditLogItem): string {
  const m = item.metadata ?? {};
  const before = item.before as Record<string, unknown> | null;
  const after = item.after as Record<string, unknown> | null;
  const action = item.action;
  if (action === 'booking.status.changed' || action === 'booking.completed' || action === 'booking.cancelled') {
    const f = before && typeof before['status'] === 'string' ? (before['status'] as string) : '?';
    const t = after && typeof after['status'] === 'string' ? (after['status'] as string) : '?';
    return `${f} → ${t}`;
  }
  if (action.startsWith('payment.')) {
    const amt = (m as Record<string, unknown>)['amountGbp'];
    return amt ? `£${String(amt)}` : '';
  }
  if (action === 'stock.decremented.by_webhook' || action === 'stock.updated.by_admin') {
    const before = (m as Record<string, unknown>)['quantityBefore'];
    const after = (m as Record<string, unknown>)['quantityAfter'];
    return before !== undefined ? `${String(before)} → ${String(after)}` : '';
  }
  if (action === 'cancellation.created') {
    const stage = after && typeof after['stage'] === 'string' ? after['stage'] : '';
    const dec = after && typeof after['depositDecision'] === 'string' ? after['depositDecision'] : '';
    return [stage, dec].filter(Boolean).join(' • ');
  }
  return '';
}

function AuditLogRow({ item }: { item: AuditLogItem }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const created = new Date(item.createdAt);
  const summary = shortSummary(item);
  return (
    <GoldCard className="mb-2">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-text font-semibold">{item.action}</Text>
          <Text className="text-text-muted text-xs mt-1">
            {actorLabel(item)} • {created.toLocaleString('en-GB')}
          </Text>
          {summary ? <Text className="text-text mt-1">{summary}</Text> : null}
        </View>
        <Pressable onPress={() => setOpen((v) => !v)} className="px-2 py-1">
          <Text className="text-gold text-xs">{open ? 'Hide' : 'Show details'}</Text>
        </Pressable>
      </View>
      {open ? (
        <View className="mt-3 pt-3 border-t border-border">
          {item.entityType ? (
            <Text className="text-text-muted text-xs">Entity: {item.entityType}</Text>
          ) : null}
          {item.bookingId ? (
            <Text className="text-text-muted text-xs">Booking: {item.bookingId.slice(0, 8)}…</Text>
          ) : null}
          {item.metadata && Object.keys(item.metadata).length > 0 ? (
            <Text className="text-text text-xs mt-2" numberOfLines={8}>
              {Object.entries(item.metadata)
                .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
                .join('\n')}
            </Text>
          ) : null}
        </View>
      ) : null}
    </GoldCard>
  );
}

export function AuditLogList(props: AuditLogListProps): React.JSX.Element {
  const { bookingId, entityType, pageSize = 50 } = props;
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listAuditLogs({
          ...(bookingId ? { bookingId } : {}),
          ...(entityType ? { entityType } : {}),
          ...(reset ? {} : cursor ? { cursor } : {}),
          limit: pageSize,
        });
        setHasMore(res.hasMore);
        setCursor(res.nextCursor);
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not load audit log');
      } finally {
        setLoading(false);
      }
    },
    [bookingId, entityType, cursor, pageSize],
  );

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, entityType]);

  return (
    <View className="flex-1">
      {error ? (
        <GoldCard className="mb-2">
          <Text className="text-danger">{error}</Text>
        </GoldCard>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <AuditLogRow item={item} />}
        refreshControl={
          <RefreshControl refreshing={loading && items.length === 0} onRefresh={() => void load(true)} tintColor="#D4AF37" />
        }
        ListEmptyComponent={
          loading ? null : (
            <GoldCard>
              <Text className="text-text-muted">No audit log entries yet.</Text>
            </GoldCard>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <Pressable
              onPress={() => void load(false)}
              className="rounded-xl bg-surfaceMuted py-3 items-center mt-2"
            >
              {loading ? <ActivityIndicator color="#D4AF37" /> : <Text className="text-text">Load more</Text>}
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}
