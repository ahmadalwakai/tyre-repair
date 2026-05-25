import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { AdminIcon } from '@/components/ui/AdminIcon';
import { adminGlobalSearch, type AdminSearchResponse } from '@/lib/api/search';
import { ApiError } from '@/lib/api/client';

function BackButton(): React.JSX.Element {
  const goBack = (): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/today' as never);
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
      <AdminIcon name="chevron-left" size={20} color="#D4AF37" />
      <Text className="text-gold text-base ml-1">Back</Text>
    </Pressable>
  );
}

export default function SearchScreen(): React.JSX.Element {
  const [q, setQ] = useState('');
  const [data, setData] = useState<AdminSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const res = await adminGlobalSearch(term.trim(), ctrl.signal);
      if (!ctrl.signal.aborted) setData(res);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e instanceof ApiError ? e.message : 'Search failed');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void run(q);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, run]);

  const empty = useMemo(
    () => !loading && data && data.bookings.length === 0 && data.customers.length === 0,
    [data, loading],
  );

  return (
    <AppShell>
      <OfflineBanner />
      <View className="flex-row items-center pt-2">
        <BackButton />
        <View className="flex-1">
          <ScreenHeader title="Search" subtitle="Booking, phone, name, registration" />
        </View>
      </View>
      <View className="px-3 pt-2">
        <View className="bg-surface border border-gold/40 rounded-lg px-3 py-2 flex-row items-center">
          <AdminIcon name="search" size={18} color="#D4AF37" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search booking, phone, name, registration"
            placeholderTextColor="#7a7a82"
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
            style={{ color: '#fff', fontSize: 16, padding: 4, flex: 1, marginLeft: 8 }}
            returnKeyType="search"
          />
        </View>
        <Text className="text-text-dim text-[11px] mt-1">
          Type at least 2 characters. Tracking IDs look like TR-XXXXXX.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
        {loading ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#D4AF37" />
          </View>
        ) : null}

        {error ? (
          <GoldCard className="mb-3" tone="warning">
            <Text className="text-text">{error}</Text>
          </GoldCard>
        ) : null}

        {empty ? (
          <GoldCard className="mb-3" tone="info">
            <Text className="text-text">No matches.</Text>
            <Text className="text-text-dim text-xs mt-1">
              Try a phone number, customer name, tracking ID, or vehicle registration.
            </Text>
          </GoldCard>
        ) : null}

        {data && data.bookings.length > 0 ? (
          <View className="mb-3">
            <Text className="text-text-dim text-[11px] uppercase tracking-wide mb-1">
              Bookings
            </Text>
            {data.bookings.map((b) => (
              <Pressable
                key={b.bookingId}
                onPress={() => router.push(`/bookings/${b.bookingId}` as never)}
                className="mb-2"
              >
                <GoldCard>
                  <View className="flex-row justify-between">
                    <Text className="text-text font-semibold">{b.trackingId}</Text>
                    <Text className="text-text-dim text-xs">
                      {b.jobType === 'ASSESSMENT' ? 'Assessment' : 'Replacement'}
                    </Text>
                  </View>
                  {b.customerName || b.customerPhone ? (
                    <Text className="text-text text-xs mt-1">
                      {[b.customerName, b.customerPhone].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                  {b.vehicleRegistration ? (
                    <Text className="text-text-dim text-xs mt-0.5">
                      Reg: {b.vehicleRegistration}
                    </Text>
                  ) : null}
                  <Text className="text-text-dim text-[11px] mt-1">
                    {b.status} · {b.paymentStatus}
                  </Text>
                </GoldCard>
              </Pressable>
            ))}
          </View>
        ) : null}

        {data && data.customers.length > 0 ? (
          <View className="mb-3">
            <Text className="text-text-dim text-[11px] uppercase tracking-wide mb-1">
              Customers
            </Text>
            {data.customers.map((c) => (
              <Pressable
                key={c.customerId}
                onPress={() => {
                  if (c.lastBookingId) {
                    router.push(`/bookings/${c.lastBookingId}` as never);
                  }
                }}
                className="mb-2"
              >
                <GoldCard>
                  <View className="flex-row justify-between">
                    <Text className="text-text font-semibold">
                      {c.fullName ?? c.phone}
                    </Text>
                    <Text className="text-text-dim text-xs">
                      {c.bookingsCount} booking{c.bookingsCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <Text className="text-text-dim text-xs mt-1">{c.phone}</Text>
                  {c.lastBookingTrackingId ? (
                    <Text className="text-text-dim text-[11px] mt-1">
                      Last: {c.lastBookingTrackingId}
                    </Text>
                  ) : null}
                </GoldCard>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
