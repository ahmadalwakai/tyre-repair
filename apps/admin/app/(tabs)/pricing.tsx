import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, RefreshControl, Pressable } from 'react-native';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import { ErrorState, LoadingState } from '@/components/ui/States';
import {
  createOverride,
  deactivateOverride,
  listOverrides,
  listRules,
  patchRules,
} from '@/lib/api/pricing';
import type { PricingOverride, PricingRule } from '@/types/pricing';
import { ApiError } from '@/lib/api/client';

export default function PricingScreen(): React.JSX.Element {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [overrides, setOverrides] = useState<PricingOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // new override
  const [oType, setOType] = useState<'surge' | 'discount'>('surge');
  const [oLabel, setOLabel] = useState('');
  const [oMultiplier, setOMultiplier] = useState('1.10');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [r, o] = await Promise.all([listRules(), listOverrides()]);
      setRules(r.rules);
      setOverrides(o.overrides);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load pricing');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRules = async (): Promise<void> => {
    const updates = Object.entries(edited).map(([key, numericValue]) => ({ key, numericValue }));
    if (updates.length === 0) return;
    setSaving(true);
    try {
      await patchRules(updates);
      setEdited({});
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save rules');
    } finally {
      setSaving(false);
    }
  };

  const create = async (): Promise<void> => {
    if (!oLabel.trim()) return;
    const mult = Number(oMultiplier);
    if (!Number.isFinite(mult) || mult <= 0) return;
    setCreating(true);
    try {
      await createOverride({ type: oType, label: oLabel.trim(), multiplier: mult });
      setOLabel('');
      setOMultiplier('1.10');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create override');
    } finally {
      setCreating(false);
    }
  };

  const deactivate = async (id: string): Promise<void> => {
    try {
      await deactivateOverride(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not deactivate');
    }
  };

  if (loading) {
    return (
      <AppShell>
        <ScreenHeader title="Pricing" />
        <LoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScreenHeader title="Pricing" subtitle="Rules & overrides" />
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
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
      >
        <GoldCard>
          <Text className="text-text font-semibold text-base mb-3">Rules</Text>
          <View className="gap-2">
            {rules.map((r) => (
              <View key={r.id} className="flex-row items-center justify-between border-b border-border pb-2">
                <View className="flex-1 pr-3">
                  <Text className="text-text">{r.label}</Text>
                  <Text className="text-text-dim text-xs">{r.key}</Text>
                </View>
                <View className="w-28">
                  <GoldInput
                    keyboardType="decimal-pad"
                    value={String(edited[r.key] ?? r.numericValue)}
                    onChangeText={(t) => {
                      const n = Number(t);
                      if (Number.isFinite(n)) {
                        setEdited((p) => ({ ...p, [r.key]: n }));
                      }
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
          <View className="mt-3">
            <GoldButton
              label={saving ? 'Saving...' : 'Save changes'}
              onPress={saveRules}
              loading={saving}
              disabled={Object.keys(edited).length === 0}
            />
          </View>
        </GoldCard>

        <GoldCard>
          <Text className="text-text font-semibold text-base mb-3">New override</Text>
          <View className="gap-3">
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setOType('surge')}
                className={`flex-1 rounded-lg p-2 items-center border ${oType === 'surge' ? 'bg-gold border-gold' : 'bg-surfaceMuted border-border'}`}
              >
                <Text className={oType === 'surge' ? 'text-canvas font-semibold' : 'text-text'}>Surge</Text>
              </Pressable>
              <Pressable
                onPress={() => setOType('discount')}
                className={`flex-1 rounded-lg p-2 items-center border ${oType === 'discount' ? 'bg-gold border-gold' : 'bg-surfaceMuted border-border'}`}
              >
                <Text className={oType === 'discount' ? 'text-canvas font-semibold' : 'text-text'}>Discount</Text>
              </Pressable>
            </View>
            <GoldInput label="Label" value={oLabel} onChangeText={setOLabel} placeholder="e.g. Friday night surge" />
            <GoldInput
              label="Multiplier"
              value={oMultiplier}
              onChangeText={setOMultiplier}
              keyboardType="decimal-pad"
            />
            <GoldButton label="Create override" onPress={create} loading={creating} />
          </View>
        </GoldCard>

        <GoldCard>
          <Text className="text-text font-semibold text-base mb-3">Active overrides</Text>
          {overrides.filter((o) => o.status === 'active').length === 0 ? (
            <Text className="text-text-muted">No active overrides.</Text>
          ) : (
            overrides
              .filter((o) => o.status === 'active')
              .map((o) => (
                <View key={o.id} className="flex-row items-center justify-between border-b border-border py-2">
                  <View className="flex-1">
                    <Text className="text-text">{o.label}</Text>
                    <Text className="text-text-dim text-xs">
                      {o.type} · ×{o.multiplier}
                    </Text>
                  </View>
                  <Pressable onPress={() => void deactivate(o.id)}>
                    <Text className="text-danger font-semibold">Deactivate</Text>
                  </Pressable>
                </View>
              ))
          )}
        </GoldCard>
      </ScrollView>
    </AppShell>
  );
}
