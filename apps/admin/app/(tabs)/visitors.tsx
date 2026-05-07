import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View, Text, RefreshControl } from 'react-native';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { listLiveVisitors } from '@/lib/api/visitors';
import type { LiveVisitor } from '@/types/visitors';
import { ApiError } from '@/lib/api/client';

function VisitorRow({ visitor }: { visitor: LiveVisitor }): React.JSX.Element {
  const location = [visitor.approxCity, visitor.approxRegion, visitor.approxCountry]
    .filter(Boolean)
    .join(', ');
  return (
    <GoldCard className="mb-3">
      <Text className="text-text font-semibold">{visitor.currentPage ?? '/'}</Text>
      <Text className="text-text-muted text-xs mt-1">{location || 'unknown location'}</Text>
      <Text className="text-text-dim text-xs mt-1">
        last seen {new Date(visitor.lastSeenAt).toLocaleTimeString()}
      </Text>
      {!visitor.consentGiven ? (
        <Text className="text-warning text-xs mt-1">no analytics consent</Text>
      ) : null}
    </GoldCard>
  );
}

export default function VisitorsScreen(): React.JSX.Element {
  const [visitors, setVisitors] = useState<LiveVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listLiveVisitors();
      setVisitors(res.visitors);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load visitors');
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

  if (loading) {
    return (
      <AppShell>
        <ScreenHeader title="Live Visitors" />
        <LoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScreenHeader title="Live Visitors" subtitle={`${visitors.length} active in last 15 min`} />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : visitors.length === 0 ? (
        <EmptyState message="No active visitors. People browsing the site will show up here in real time." />
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={(v) => v.visitorId}
          renderItem={({ item }) => <VisitorRow visitor={item} />}
          contentContainerStyle={{ padding: 16 }}
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
