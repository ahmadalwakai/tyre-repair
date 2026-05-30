import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { AdminIcon } from '@/components/ui/AdminIcon';
import { GoldCard } from '@/components/ui/GoldCard';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { InteractiveMapView, type MapPin } from '@/components/maps/InteractiveMapView';
import { listLiveVisitors } from '@/lib/api/visitors';
import { ApiError } from '@/lib/api/client';
import type { LiveVisitor } from '@/types/visitors';

const ACTIVE_NOW_SECONDS = 60;
const REFRESH_INTERVAL_MS = 30_000;

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

function friendlyPage(raw: string | null): { label: string; path: string } {
  const path = (raw ?? '/').trim() || '/';
  const clean = path.split('?')[0].split('#')[0];
  if (clean === '/' || clean === '') return { label: 'Homepage', path: '/' };
  const seg = clean.replace(/^\/+/, '').split('/').filter(Boolean);
  const first = seg[0] ?? 'page';
  const label = first.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { label, path: clean };
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

function colorForPage(path: string): string {
  // Stable hue per landing path so the same page gets the same pin colour.
  let hash = 0;
  for (let i = 0; i < path.length; i += 1) {
    hash = (hash * 31 + path.charCodeAt(i)) & 0xffffffff;
  }
  const palette = ['#E30613', '#D4AF37', '#22C55E', '#0EA5E9', '#A855F7', '#F97316', '#14B8A6'];
  return palette[Math.abs(hash) % palette.length] ?? '#E30613';
}

export default function SeoDiagnosticsScreen(): React.JSX.Element {
  const [visitors, setVisitors] = useState<LiveVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      const res = await listLiveVisitors();
      setVisitors(res.visitors);
      setError(null);
      setLastUpdatedMs(Date.now());
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not load visitor traffic';
      setError(message);
    } finally {
      if (mode === 'initial') setLoading(false);
      if (mode === 'refresh') setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1_000);
    const poll = setInterval(() => void load('silent'), REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [load]);

  const mappable = useMemo(
    () =>
      visitors.filter(
        (v): v is LiveVisitor & { latitude: number; longitude: number } =>
          typeof v.latitude === 'number' && typeof v.longitude === 'number',
      ),
    [visitors],
  );

  const pins: MapPin[] = useMemo(
    () =>
      mappable.map((v) => {
        const { label, path } = friendlyPage(v.currentPage);
        const where = [v.approxCity, v.approxCountry].filter(Boolean).join(', ');
        return {
          id: v.visitorId,
          latitude: v.latitude,
          longitude: v.longitude,
          title: `${label}${where ? ` · ${where}` : ''}`,
          color: colorForPage(path),
        };
      }),
    [mappable],
  );

  const topLandingPages = useMemo(() => {
    const counts = new Map<string, { label: string; count: number; color: string }>();
    for (const v of visitors) {
      const { label, path } = friendlyPage(v.currentPage);
      const key = path;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { label, count: 1, color: colorForPage(path) });
    }
    return Array.from(counts.entries())
      .map(([path, value]) => ({ path, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [visitors]);

  const topCountries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of visitors) {
      const c = v.approxCountry?.trim();
      if (!c) continue;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [visitors]);

  const activeNow = useMemo(
    () =>
      visitors.filter(
        (v) => (nowMs - new Date(v.lastSeenAt).getTime()) / 1000 <= ACTIVE_NOW_SECONDS,
      ).length,
    [visitors, nowMs],
  );

  if (loading) {
    return (
      <AppShell>
        <OfflineBanner />
        <View className="flex-row items-center pt-2">
          <BackButton />
          <View className="flex-1">
            <ScreenHeader
              title="SEO diagnostics"
              subtitle="Live map of website traffic locations"
            />
          </View>
        </View>
        <LoadingState label="Loading visitor traffic…" />
      </AppShell>
    );
  }

  if (error && visitors.length === 0) {
    return (
      <AppShell>
        <OfflineBanner />
        <View className="flex-row items-center pt-2">
          <BackButton />
          <View className="flex-1">
            <ScreenHeader title="SEO diagnostics" subtitle="Live map of website traffic locations" />
          </View>
        </View>
        <ErrorState message={error} onRetry={() => void load('initial')} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <OfflineBanner />
      <View className="flex-row items-center pt-2">
        <BackButton />
        <View className="flex-1">
          <ScreenHeader
            title="SEO diagnostics"
            subtitle="Live map of website traffic locations"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load('refresh')}
            tintColor="#D4AF37"
          />
        }
      >
        {/* Summary tiles */}
        <View className="flex-row mb-3">
          <View className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 mr-2">
            <Text className="text-text-dim text-[10px] uppercase tracking-wide">Active now</Text>
            <View className="flex-row items-end mt-0.5">
              <Text className="text-text text-2xl font-bold">{activeNow}</Text>
              <Text className="text-text-muted text-xs ml-1.5 mb-1">last 60s</Text>
            </View>
          </View>
          <View className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 mr-2">
            <Text className="text-text-dim text-[10px] uppercase tracking-wide">On map</Text>
            <View className="flex-row items-end mt-0.5">
              <Text className="text-text text-2xl font-bold">{mappable.length}</Text>
              <Text className="text-text-muted text-xs ml-1.5 mb-1">/ {visitors.length}</Text>
            </View>
          </View>
          <View className="flex-1 bg-surface border border-border rounded-lg px-3 py-2">
            <Text className="text-text-dim text-[10px] uppercase tracking-wide">Updated</Text>
            <Text className="text-text text-sm font-semibold mt-0.5" numberOfLines={1}>
              {lastUpdatedMs ? relativeTime(new Date(lastUpdatedMs).toISOString(), nowMs) : '—'}
            </Text>
          </View>
        </View>

        {/* Map */}
        <AnimatedCard>
          <View className="bg-surface rounded-xl border border-border p-3 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-text font-semibold text-base">Traffic map</Text>
              <Text className="text-text-dim text-xs">{pins.length} pinned</Text>
            </View>
            {pins.length > 0 ? (
              <InteractiveMapView pins={pins} height={340} />
            ) : (
              <View
                className="rounded-lg border border-border items-center justify-center"
                style={{ height: 200, backgroundColor: '#1A1A22' }}
              >
                <Text className="text-text-muted text-sm">
                  No visitor coordinates available yet
                </Text>
                <Text className="text-text-dim text-xs mt-1 px-6 text-center">
                  Visitors are mapped once geolocation is recorded (consent + edge IP lookup).
                </Text>
              </View>
            )}
          </View>
        </AnimatedCard>

        {/* Top landing pages */}
        <AnimatedCard>
          <View className="bg-surface rounded-xl border border-border p-4 mb-3">
            <Text className="text-text font-semibold text-base mb-2">Top landing pages</Text>
            {topLandingPages.length === 0 ? (
              <Text className="text-text-muted text-sm">No traffic in the last 15 minutes.</Text>
            ) : (
              topLandingPages.map((p) => (
                <View
                  key={p.path}
                  className="flex-row items-center justify-between py-1.5 border-b border-border/40 last:border-b-0"
                >
                  <View className="flex-row items-center flex-1 pr-3">
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: p.color,
                        marginRight: 8,
                      }}
                    />
                    <View className="flex-1">
                      <Text className="text-text text-sm" numberOfLines={1}>
                        {p.label}
                      </Text>
                      <Text className="text-text-dim text-xs" numberOfLines={1}>
                        {p.path}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-text-muted text-sm font-semibold">{p.count}</Text>
                </View>
              ))
            )}
          </View>
        </AnimatedCard>

        {/* Top countries */}
        <AnimatedCard>
          <View className="bg-surface rounded-xl border border-border p-4 mb-3">
            <Text className="text-text font-semibold text-base mb-2">Top countries</Text>
            {topCountries.length === 0 ? (
              <Text className="text-text-muted text-sm">No country data yet.</Text>
            ) : (
              topCountries.map(([country, count]) => (
                <View
                  key={country}
                  className="flex-row items-center justify-between py-1.5 border-b border-border/40 last:border-b-0"
                >
                  <Text className="text-text text-sm">{country}</Text>
                  <Text className="text-text-muted text-sm font-semibold">{count}</Text>
                </View>
              ))
            )}
          </View>
        </AnimatedCard>

        {/* Map legend / per-visitor list */}
        {mappable.length > 0 ? (
          <AnimatedCard>
            <View className="bg-surface rounded-xl border border-border p-4">
              <Text className="text-text font-semibold text-base mb-2">Mapped visitors</Text>
              <FlatList
                data={mappable}
                keyExtractor={(v) => v.visitorId}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View className="h-2" />}
                renderItem={({ item }) => {
                  const { label, path } = friendlyPage(item.currentPage);
                  const where = [item.approxCity, item.approxRegion, item.approxCountry]
                    .filter(Boolean)
                    .join(', ');
                  return (
                    <GoldCard>
                      <View className="flex-row items-start">
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: colorForPage(path),
                            marginRight: 8,
                            marginTop: 6,
                          }}
                        />
                        <View className="flex-1">
                          <Text className="text-text font-semibold text-sm">{label}</Text>
                          <Text className="text-text-dim text-xs" numberOfLines={1}>
                            {path}
                          </Text>
                          <Text className="text-text-muted text-xs mt-1">
                            {where || 'Location unknown'}
                          </Text>
                          <Text className="text-text-dim text-[10px] mt-0.5">
                            {item.latitude.toFixed(3)}, {item.longitude.toFixed(3)} ·{' '}
                            {relativeTime(item.lastSeenAt, nowMs)}
                          </Text>
                        </View>
                      </View>
                    </GoldCard>
                  );
                }}
              />
            </View>
          </AnimatedCard>
        ) : visitors.length > 0 ? (
          <EmptyState
            title="No mapped traffic"
            message="Visitors are connected but their coordinates aren't available yet."
          />
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
