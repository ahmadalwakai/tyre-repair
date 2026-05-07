import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import {
  getServiceAvailability,
  updateServiceAvailability,
} from '@/lib/api/admin-efficiency';
import { ApiError } from '@/lib/api/client';
import type {
  ServiceAvailabilityMode,
  ServiceAvailabilitySettings,
} from '@/types/admin-efficiency';

const MODES: { key: ServiceAvailabilityMode; label: string; help: string }[] = [
  { key: 'NORMAL', label: 'Normal', help: 'Standard wait times. Site shows no warning.' },
  { key: 'HIGH_DEMAND', label: 'High demand', help: 'Warns customers wait may be longer.' },
  { key: 'CALL_FIRST', label: 'Call first', help: 'Asks customers to call before booking online.' },
  {
    key: 'TEMPORARILY_LIMITED',
    label: 'Temporarily limited',
    help: 'Tells customers we may not be able to attend today.',
  },
];

/** Admin Efficiency Pack F11 — Service availability mode panel. */
export function ServiceAvailabilityPanel(): React.JSX.Element {
  const [settings, setSettings] = useState<ServiceAvailabilitySettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getServiceAvailability()
      .then(setSettings)
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : 'Could not load service availability'),
      );
  }, []);

  const save = async (): Promise<void> => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await updateServiceAvailability(settings);
      setSettings(next);
      Alert.alert('Saved', 'Service availability updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof ApiError ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GoldCard className="mb-3">
      <Text className="text-text font-semibold mb-1">Public site service availability</Text>
      <Text className="text-text-dim text-xs mb-3">
        Sets the operational tone shown to customers on the public site. Does not change pricing
        or block bookings.
      </Text>
      {error ? <Text className="text-danger text-xs mb-2">{error}</Text> : null}
      {!settings ? (
        <Text className="text-text-muted">Loading…</Text>
      ) : (
        <>
          {MODES.map((m) => {
            const active = settings.mode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setSettings({ ...settings, mode: m.key })}
                className={`rounded-xl p-3 border mb-2 ${
                  active ? 'border-gold bg-surface' : 'border-border bg-surfaceMuted'
                }`}
              >
                <Text className={`font-semibold ${active ? 'text-gold' : 'text-text'}`}>
                  {m.label}
                </Text>
                <Text className="text-text-dim text-xs mt-1">{m.help}</Text>
              </Pressable>
            );
          })}
          <View className="mt-2">
            <GoldInput
              label="Custom detail (optional)"
              placeholder="Override the default detail line shown to customers"
              value={settings.customDetail ?? ''}
              onChangeText={(v) => setSettings({ ...settings, customDetail: v.trim() ? v : null })}
              multiline
            />
          </View>
          <View className="items-end mt-3">
            <GoldButton label="Save availability" onPress={() => void save()} loading={saving} />
          </View>
        </>
      )}
    </GoldCard>
  );
}
