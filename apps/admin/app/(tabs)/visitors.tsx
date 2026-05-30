import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View, Text, RefreshControl, Pressable } from 'react-native';
import { router } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { AdminIcon } from '@/components/ui/AdminIcon';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { listLiveVisitors } from '@/lib/api/visitors';
import type { LiveVisitor } from '@/types/visitors';
import { ApiError } from '@/lib/api/client';

const ACTIVE_NOW_SECONDS = 60;

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

function relativeTime(iso: string, nowMs: number): string {
  const diffSec = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 1000));
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function friendlyPage(raw: string | null): { label: string; path: string } {
  const path = (raw ?? '/').trim() || '/';
  const clean = path.split('?')[0].split('#')[0];
  if (clean === '/' || clean === '') return { label: 'Homepage', path: '/' };
  const seg = clean.replace(/^\/+/, '').split('/').filter(Boolean);
  const map: Record<string, string> = {
    booking: 'Booking',
    book: 'Booking',
    bookings: 'Booking',
    quote: 'Quote',
    quotes: 'Quote',
    services: 'Services',
    service: 'Service',
    contact: 'Contact',
    about: 'About',
    pricing: 'Pricing',
    tyres: 'Tyres',
    blog: 'Blog',
    faq: 'FAQ',
    account: 'Account',
    checkout: 'Checkout',
    success: 'Booking success',
    confirmation: 'Confirmation',
  };
  const first = seg[0]?.toLowerCase() ?? '';
  const label =
    map[first] ??
    (seg[0]
      ? seg[0].replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Page');
  return { label, path: clean };
}

const COUNTRY_FLAGS: Record<string, string> = {
  'united kingdom': '🇬🇧',
  uk: '🇬🇧',
  gb: '🇬🇧',
  england: '🇬🇧',
  ireland: '🇮🇪',
  'united states': '🇺🇸',
  usa: '🇺🇸',
  us: '🇺🇸',
  france: '🇫🇷',
  germany: '🇩🇪',
  spain: '🇪🇸',
  italy: '🇮🇹',
  netherlands: '🇳🇱',
  poland: '🇵🇱',
  india: '🇮🇳',
};

function countryFlag(country: string | null): string {
  if (!country) return '🌐';
  return COUNTRY_FLAGS[country.toLowerCase().trim()] ?? '🌐';
}

interface VisitorRowProps {
  visitor: LiveVisitor;
  nowMs: number;
}

function VisitorRow({ visitor, nowMs }: VisitorRowProps): React.JSX.Element {
  const { label, path } = friendlyPage(visitor.currentPage);
  const locationParts = [visitor.approxCity, visitor.approxRegion, visitor.approxCountry].filter(
    Boolean,
  ) as string[];
  const location = locationParts.join(', ');
  const ageSec = Math.max(0, Math.round((nowMs - new Date(visitor.lastSeenAt).getTime()) / 1000));
  const isActiveNow = ageSec <= ACTIVE_NOW_SECONDS;

  return (
    <GoldCard className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-text font-semibold text-base">{label}</Text>
          {path !== '/' && path.toLowerCase() !== `/${label.toLowerCase()}` ? (
            <Text
              className="text-text-dim text-xs mt-0.5"
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {path}
            </Text>
          ) : null}
        </View>
        {isActiveNow ? (
          <View className="flex-row items-center bg-success/15 px-2 py-1 rounded-full">
            <View className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
            <Text className="text-success text-[10px] font-semibold uppercase tracking-wide">
              Live
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center mt-2">
        <Text className="text-base mr-1.5">{countryFlag(visitor.approxCountry)}</Text>
        <Text className="text-text-muted text-xs flex-1" numberOfLines={1}>
          {location || 'Location unknown'}
        </Text>
      </View>

      <View className="flex-row items-center justify-between mt-1.5">
        <Text className="text-text-dim text-xs">
          Last seen {relativeTime(visitor.lastSeenAt, nowMs)}
        </Text>
        {!visitor.consentGiven ? (
          <Text className="text-warning text-[10px] font-medium">No analytics consent</Text>
        ) : null}
      </View>
    </GoldCard>
  );
}

interface SummaryProps {
  visitors: LiveVisitor[];
  nowMs: number;
  lastUpdatedMs: number | null;
}

function Summary({ visitors, nowMs, lastUpdatedMs }: SummaryProps): React.JSX.Element {
  const activeNow = visitors.filter(
    (v) => (nowMs - new Date(v.lastSeenAt).getTime()) / 1000 <= ACTIVE_NOW_SECONDS,
  ).length;
  const topPage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of visitors) {
      const { label } = friendlyPage(v.currentPage);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    let best: { label: string; count: number } | null = null;
    for (const [label, count] of counts) {
      if (!best || count > best.count) best = { label, count };
    }
    return best;
  }, [visitors]);

  const updatedAgo = lastUpdatedMs
    ? relativeTime(new Date(lastUpdatedMs).toISOString(), nowMs)
    : '—';

  return (
    <View className="px-4 pt-3 pb-1">
      <View className="flex-row">
        <View className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 mr-2">
          <Text className="text-text-dim text-[10px] uppercase tracking-wide">Active now</Text>
          <View className="flex-row items-end mt-0.5">
            <Text className="text-text text-2xl font-bold">{activeNow}</Text>
            <Text className="text-text-muted text-xs ml-1.5 mb-1">in last min</Text>
          </View>
        </View>
        <View className="flex-1 bg-surface border border-border rounded-lg px-3 py-2">
          <Text className="text-text-dim text-[10px] uppercase tracking-wide">Last 15 min</Text>
          <View className="flex-row items-end mt-0.5">
            <Text className="text-text text-2xl font-bold">{visitors.length}</Text>
            <Text className="text-text-muted text-xs ml-1.5 mb-1">visitors</Text>
          </View>
        </View>
      </View>
      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-text-muted text-xs flex-1 pr-2" numberOfLines={1}>
          {topPage ? `Most viewed: ${topPage.label} (${topPage.count})` : ' '}
        </Text>
        <Text className="text-text-dim text-[10px]">Updated {updatedAgo}</Text>
      </View>
    </View>
  );
}

export default function VisitorsScreen(): React.JSX.Element {
  const [visitors, setVisitors] = useState<LiveVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listLiveVisitors();
      setVisitors(res.visitors);
      setLastUpdatedMs(Date.now());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load visitors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const fetchId = setInterval(() => {
      void load();
    }, 30_000);
    const tickId = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => {
      clearInterval(fetchId);
      clearInterval(tickId);
    };
  }, [load]);

  const header = (
    <View className="flex-row items-center pt-2">
      <BackButton />
      <View className="flex-1">
        <ScreenHeader title="Live Visitors" subtitle="People browsing the website right now" />
      </View>
    </View>
  );

  if (loading) {
    return (
      <AppShell>
        {header}
        <LoadingState />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        {header}
        <ErrorState message={error} onRetry={load} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {header}
      <Summary visitors={visitors} nowMs={nowMs} lastUpdatedMs={lastUpdatedMs} />
      {visitors.length === 0 ? (
        <EmptyState message="No one is browsing the website right now. Pull down to refresh — visitors appear here within a few seconds of landing on the site." />
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={(v) => v.visitorId}
          renderItem={({ item, index }) => (
            <AnimatedCard delay={Math.min(index, 8) * 50}>
              <VisitorRow visitor={item} nowMs={nowMs} />
            </AnimatedCard>
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
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
