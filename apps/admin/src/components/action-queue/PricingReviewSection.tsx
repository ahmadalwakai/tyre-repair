import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { PricingReviewCard } from './PricingReviewCard';
import { getOpenPricingReviewItems } from '@/lib/api/action-queue-items';
import type { ActionQueueItemDto } from '@/types/action-queue-items';
import { subscribePrivate } from '@/lib/realtime/client';

const PUSHER_EVENT = 'admin.action_queue.pricing_review_upserted';

/**
 * Persistent OPEN PRICING_REVIEW_REQUIRED items.
 *
 * Self-contained — fetches its own data, subscribes to the
 * `private-admin` channel for live upserts, and refetches when the app is
 * foregrounded so missed Pusher events get caught up.
 */
export function PricingReviewSection(): React.JSX.Element | null {
  const [items, setItems] = useState<ActionQueueItemDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      const res = await getOpenPricingReviewItems(ctl.signal);
      setItems(res.items);
    } catch {
      // Soft-fail — keep whatever we already had so the section never blocks
      // the wider action queue UI.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [refetch]);

  // Live updates via Pusher. The event is fire-and-forget — we always
  // refetch the canonical list rather than mutating in place, so admins on
  // older clients still see the same view.
  useEffect(() => {
    const channel = subscribePrivate('private-admin');
    if (!channel) return undefined;
    const handler = (): void => {
      void refetch();
    };
    channel.bind(PUSHER_EVENT, handler);
    return () => {
      channel.unbind(PUSHER_EVENT, handler);
    };
  }, [refetch]);

  // Replay on foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void refetch();
    });
    return () => {
      sub.remove();
    };
  }, [refetch]);

  const removeItem = useCallback((id: string): void => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  if (!loaded || items.length === 0) return null;

  return (
    <View className="px-3 pt-3">
      <Text className="text-fg-muted text-xs uppercase tracking-wider mb-2">
        Pricing review required
      </Text>
      {items.map((it) => (
        <PricingReviewCard key={it.id} item={it} onResolved={removeItem} />
      ))}
    </View>
  );
}
