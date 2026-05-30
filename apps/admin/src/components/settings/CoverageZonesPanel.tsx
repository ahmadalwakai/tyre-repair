import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import {
  createCoverageZone,
  deleteCoverageZone,
  listCoverageZones,
  updateCoverageZone,
} from '@/lib/api/coverage-zones';
import { ApiError } from '@/lib/api/client';
import type {
  CoverageZone,
  CoverageZoneStatus,
  CoverageZoneWriteInput,
} from '@/types/coverage-zones';

const STATUSES: readonly CoverageZoneStatus[] = ['active', 'paused', 'unavailable'];

interface RowDraft {
  zone: CoverageZone;
  name: string;
  slug: string;
  status: CoverageZoneStatus;
  cityOrRegion: string;
  postcodePrefixesText: string;
  basePostcode: string;
  radiusMilesText: string;
  minMinutesText: string;
  maxMinutesText: string;
  callOutFeeGbpText: string;
  availableNow: boolean;
  availableToday: boolean;
  availableTomorrow: boolean;
  dailyCapacityText: string;
  priorityText: string;
  notes: string;
  open: boolean;
  saving: boolean;
}

function toDraft(z: CoverageZone, open = false): RowDraft {
  return {
    zone: z,
    name: z.name,
    slug: z.slug,
    status: z.status,
    cityOrRegion: z.cityOrRegion,
    postcodePrefixesText: z.postcodePrefixes.join(','),
    basePostcode: z.basePostcode,
    radiusMilesText: String(z.radiusMiles),
    minMinutesText: String(z.estimatedResponseMinutesMin),
    maxMinutesText: String(z.estimatedResponseMinutesMax),
    callOutFeeGbpText: (z.callOutFeePence / 100).toFixed(2),
    availableNow: z.availableNow,
    availableToday: z.availableToday,
    availableTomorrow: z.availableTomorrow,
    dailyCapacityText: String(z.dailyCapacity),
    priorityText: String(z.priority),
    notes: z.notes ?? '',
    open,
    saving: false,
  };
}

function buildPayload(d: RowDraft): CoverageZoneWriteInput | string {
  const prefixes = d.postcodePrefixesText
    .split(/[\s,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);
  if (prefixes.length === 0) return 'Add at least one postcode prefix.';

  const radiusMiles = Number(d.radiusMilesText);
  if (!Number.isFinite(radiusMiles) || radiusMiles < 0 || radiusMiles > 500)
    return 'Radius must be 0–500 miles.';
  const minMin = Number(d.minMinutesText);
  const maxMin = Number(d.maxMinutesText);
  if (!Number.isInteger(minMin) || minMin < 0 || minMin > 1440)
    return 'Min minutes must be 0–1440.';
  if (!Number.isInteger(maxMin) || maxMin < 0 || maxMin > 1440)
    return 'Max minutes must be 0–1440.';
  if (maxMin < minMin) return 'Max minutes must be ≥ min minutes.';
  const callOutFeeGbp = Number(d.callOutFeeGbpText);
  if (!Number.isFinite(callOutFeeGbp) || callOutFeeGbp < 0 || callOutFeeGbp > 10000)
    return 'Call-out fee must be a GBP amount 0–10000.';
  const dailyCapacity = Number(d.dailyCapacityText);
  if (!Number.isInteger(dailyCapacity) || dailyCapacity < 0 || dailyCapacity > 10000)
    return 'Daily capacity must be 0–10000.';
  const priority = Number(d.priorityText);
  if (!Number.isInteger(priority) || priority < 0 || priority > 999)
    return 'Priority must be 0–999.';

  return {
    slug: d.slug.trim().toLowerCase(),
    name: d.name.trim(),
    status: d.status,
    cityOrRegion: d.cityOrRegion.trim(),
    postcodePrefixes: prefixes,
    basePostcode: d.basePostcode.trim().toUpperCase(),
    radiusMiles: Math.round(radiusMiles),
    estimatedResponseMinutesMin: minMin,
    estimatedResponseMinutesMax: maxMin,
    callOutFeePence: Math.round(callOutFeeGbp * 100),
    availableNow: d.availableNow,
    availableToday: d.availableToday,
    availableTomorrow: d.availableTomorrow,
    dailyCapacity,
    priority,
    notes: d.notes.trim().length > 0 ? d.notes.trim() : null,
  };
}

function statusColor(s: CoverageZoneStatus): string {
  return s === 'active' ? 'text-green-400' : s === 'paused' ? 'text-amber-400' : 'text-red-400';
}

export function CoverageZonesPanel(): React.JSX.Element {
  const [zones, setZones] = useState<RowDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async (): Promise<void> => {
    try {
      const res = await listCoverageZones();
      setZones(res.zones.map((z) => toDraft(z)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load coverage zones');
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const sorted = useMemo(() => {
    if (!zones) return null;
    return [...zones].sort((a, b) => a.zone.priority - b.zone.priority);
  }, [zones]);

  const update = (slug: string, patch: Partial<RowDraft>): void => {
    setZones((prev) => prev?.map((r) => (r.zone.slug === slug ? { ...r, ...patch } : r)) ?? prev);
  };

  const cycleStatus = (d: RowDraft): void => {
    const next = STATUSES[(STATUSES.indexOf(d.status) + 1) % STATUSES.length];
    update(d.zone.slug, { status: next });
  };

  const saveRow = async (d: RowDraft): Promise<void> => {
    const payload = buildPayload(d);
    if (typeof payload === 'string') {
      Alert.alert('Invalid input', payload);
      return;
    }
    update(d.zone.slug, { saving: true });
    try {
      const res = await updateCoverageZone(d.zone.id, payload);
      setZones((prev) =>
        prev?.map((r) => (r.zone.id === res.zone.id ? toDraft(res.zone, true) : r)) ?? prev,
      );
      Alert.alert('Saved', `${res.zone.name} updated.`);
    } catch (e) {
      Alert.alert('Could not save', e instanceof ApiError ? e.message : 'Unknown error');
      update(d.zone.slug, { saving: false });
    }
  };

  const deleteRow = async (d: RowDraft): Promise<void> => {
    Alert.alert(
      'Delete coverage zone',
      `Remove "${d.zone.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            update(d.zone.slug, { saving: true });
            try {
              await deleteCoverageZone(d.zone.id);
              setZones((prev) => prev?.filter((r) => r.zone.id !== d.zone.id) ?? prev);
            } catch (e) {
              Alert.alert(
                'Could not delete',
                e instanceof ApiError ? e.message : 'Unknown error',
              );
              update(d.zone.slug, { saving: false });
            }
          },
        },
      ],
    );
  };

  const createBlank = async (): Promise<void> => {
    Alert.prompt?.(
      'New zone slug',
      'Lowercase letters, numbers and dashes only (e.g. "highlands-west").',
      async (raw) => {
        const slug = (raw ?? '').trim().toLowerCase();
        if (!/^[a-z0-9-]{2,80}$/.test(slug)) {
          Alert.alert('Invalid slug', 'Use 2–80 chars: a-z, 0-9, dash.');
          return;
        }
        setCreating(true);
        try {
          const res = await createCoverageZone({
            slug,
            name: slug.replace(/-/g, ' '),
            status: 'paused',
            cityOrRegion: slug,
            postcodePrefixes: ['G'],
            basePostcode: 'G1 1AA',
            radiusMiles: 10,
            estimatedResponseMinutesMin: 60,
            estimatedResponseMinutesMax: 120,
            callOutFeePence: 0,
            availableNow: false,
            availableToday: false,
            availableTomorrow: false,
            dailyCapacity: 0,
            priority: 99,
            notes: null,
          });
          setZones((prev) => (prev ? [...prev, toDraft(res.zone, true)] : [toDraft(res.zone, true)]));
          Alert.alert('Created', `${res.zone.name} added (paused).`);
        } catch (e) {
          Alert.alert('Could not create', e instanceof ApiError ? e.message : 'Unknown error');
        } finally {
          setCreating(false);
        }
      },
    );
    if (!Alert.prompt) {
      // Android fallback: create with placeholder slug.
      const slug = `zone-${Date.now()}`;
      setCreating(true);
      try {
        const res = await createCoverageZone({
          slug,
          name: 'New zone',
          status: 'paused',
          cityOrRegion: 'New region',
          postcodePrefixes: ['G'],
          basePostcode: 'G1 1AA',
          radiusMiles: 10,
          estimatedResponseMinutesMin: 60,
          estimatedResponseMinutesMax: 120,
          callOutFeePence: 0,
          availableNow: false,
          availableToday: false,
          availableTomorrow: false,
          dailyCapacity: 0,
          priority: 99,
          notes: null,
        });
        setZones((prev) => (prev ? [...prev, toDraft(res.zone, true)] : [toDraft(res.zone, true)]));
      } catch (e) {
        Alert.alert('Could not create', e instanceof ApiError ? e.message : 'Unknown error');
      } finally {
        setCreating(false);
      }
    }
  };

  return (
    <GoldCard className="mb-3">
      <Text className="text-text font-semibold mb-1">Scotland coverage zones</Text>
      <Text className="text-text-dim text-xs mb-3">
        Editable service-area list used by the public postcode checker and the SEO landing
        pages. Changes go live within 60 seconds (in-process cache).
      </Text>
      {error ? <Text className="text-danger text-xs mb-2">{error}</Text> : null}

      <View className="mb-3">
        <GoldButton
          label={creating ? 'Creating…' : '+ Add zone'}
          onPress={createBlank}
          disabled={creating}
          variant="secondary"
        />
      </View>

      {!sorted ? (
        <Text className="text-text-muted">Loading…</Text>
      ) : sorted.length === 0 ? (
        <Text className="text-text-muted">No zones defined.</Text>
      ) : (
        sorted.map((d) => (
          <View
            key={d.zone.id}
            className="border border-border rounded-lg p-3 mb-2 bg-bg-elevated"
          >
            <Pressable onPress={() => update(d.zone.slug, { open: !d.open })}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-text font-semibold">{d.zone.name}</Text>
                  <Text className="text-text-dim text-xs">
                    {d.zone.postcodePrefixes.join(', ')} · priority {d.zone.priority}
                  </Text>
                </View>
                <Text className={`text-xs font-semibold ${statusColor(d.status)}`}>
                  {d.status.toUpperCase()}
                </Text>
              </View>
            </Pressable>

            {d.open ? (
              <View className="mt-3">
                <GoldInput
                  label="Display name"
                  value={d.name}
                  onChangeText={(v) => update(d.zone.slug, { name: v })}
                />
                <GoldInput
                  label="Slug"
                  value={d.slug}
                  onChangeText={(v) => update(d.zone.slug, { slug: v })}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => cycleStatus(d)}
                  className="border border-border rounded-md px-3 py-2 my-2"
                >
                  <Text className={`text-sm font-semibold ${statusColor(d.status)}`}>
                    Status: {d.status} (tap to change)
                  </Text>
                </Pressable>
                <GoldInput
                  label="City / region"
                  value={d.cityOrRegion}
                  onChangeText={(v) => update(d.zone.slug, { cityOrRegion: v })}
                />
                <GoldInput
                  label="Postcode prefixes (comma-separated)"
                  value={d.postcodePrefixesText}
                  onChangeText={(v) => update(d.zone.slug, { postcodePrefixesText: v })}
                  autoCapitalize="characters"
                />
                <GoldInput
                  label="Base postcode"
                  value={d.basePostcode}
                  onChangeText={(v) => update(d.zone.slug, { basePostcode: v })}
                  autoCapitalize="characters"
                />
                <GoldInput
                  label="Radius (miles)"
                  value={d.radiusMilesText}
                  onChangeText={(v) => update(d.zone.slug, { radiusMilesText: v })}
                  keyboardType="number-pad"
                />
                <View className="flex-row">
                  <View className="flex-1 pr-2">
                    <GoldInput
                      label="Response min (mins)"
                      value={d.minMinutesText}
                      onChangeText={(v) => update(d.zone.slug, { minMinutesText: v })}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View className="flex-1 pl-2">
                    <GoldInput
                      label="Response max (mins)"
                      value={d.maxMinutesText}
                      onChangeText={(v) => update(d.zone.slug, { maxMinutesText: v })}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <GoldInput
                  label="Call-out fee (GBP)"
                  value={d.callOutFeeGbpText}
                  onChangeText={(v) => update(d.zone.slug, { callOutFeeGbpText: v })}
                  keyboardType="decimal-pad"
                />
                <GoldInput
                  label="Daily capacity"
                  value={d.dailyCapacityText}
                  onChangeText={(v) => update(d.zone.slug, { dailyCapacityText: v })}
                  keyboardType="number-pad"
                />
                <GoldInput
                  label="Priority (lower = first)"
                  value={d.priorityText}
                  onChangeText={(v) => update(d.zone.slug, { priorityText: v })}
                  keyboardType="number-pad"
                />
                <View className="flex-row items-center justify-between my-2">
                  <Text className="text-text">Available now</Text>
                  <Switch
                    value={d.availableNow}
                    onValueChange={(v) => update(d.zone.slug, { availableNow: v })}
                  />
                </View>
                <View className="flex-row items-center justify-between my-2">
                  <Text className="text-text">Available today</Text>
                  <Switch
                    value={d.availableToday}
                    onValueChange={(v) => update(d.zone.slug, { availableToday: v })}
                  />
                </View>
                <View className="flex-row items-center justify-between my-2">
                  <Text className="text-text">Available tomorrow</Text>
                  <Switch
                    value={d.availableTomorrow}
                    onValueChange={(v) => update(d.zone.slug, { availableTomorrow: v })}
                  />
                </View>
                <GoldInput
                  label="Internal notes (optional)"
                  value={d.notes}
                  onChangeText={(v) => update(d.zone.slug, { notes: v })}
                  multiline
                />
                <View className="flex-row mt-2">
                  <View className="flex-1 pr-2">
                    <GoldButton
                      label={d.saving ? 'Saving…' : 'Save zone'}
                      onPress={() => saveRow(d)}
                      disabled={d.saving}
                    />
                  </View>
                  <View className="flex-1 pl-2">
                    <GoldButton
                      label="Delete"
                      onPress={() => deleteRow(d)}
                      disabled={d.saving}
                      variant="danger"
                    />
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        ))
      )}
    </GoldCard>
  );
}
