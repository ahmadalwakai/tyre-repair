import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import { getPromoBanner, updatePromoBanner } from '@/lib/api/admin-efficiency';
import { ApiError } from '@/lib/api/client';
import type { PromoBannerSettings, PromoBannerVariant } from '@/types/admin-efficiency';

const VARIANTS: { key: PromoBannerVariant; label: string }[] = [
  { key: 'INFO', label: 'Info' },
  { key: 'WARNING', label: 'Warning' },
  { key: 'EMERGENCY', label: 'Emergency' },
];

/** Admin Efficiency Pack F10 — Promo banner settings panel. */
export function PromoBannerSettingsPanel(): React.JSX.Element {
  const [settings, setSettings] = useState<PromoBannerSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPromoBanner()
      .then(setSettings)
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : 'Could not load promo banner'),
      );
  }, []);

  const save = async (): Promise<void> => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await updatePromoBanner(settings);
      setSettings(next);
      Alert.alert('Saved', 'Promo banner updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof ApiError ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GoldCard className="mb-3">
      <Text className="text-text font-semibold mb-1">Public site promo banner</Text>
      <Text className="text-text-dim text-xs mb-3">
        Shown above the public site landing area. Keep it short. UK English.
      </Text>
      {error ? <Text className="text-danger text-xs mb-2">{error}</Text> : null}
      {!settings ? (
        <Text className="text-text-muted">Loading…</Text>
      ) : (
        <>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text">Show banner</Text>
            <Switch
              value={settings.enabled}
              onValueChange={(v) => setSettings({ ...settings, enabled: v })}
              trackColor={{ false: '#2A2A33', true: '#8F0010' }}
              thumbColor={settings.enabled ? '#E30613' : '#6B6B75'}
            />
          </View>
          <GoldInput
            label="Message"
            placeholder="e.g. We're open as normal across Glasgow today."
            value={settings.message}
            onChangeText={(v) => setSettings({ ...settings, message: v })}
            multiline
          />
          <Text className="text-text-muted text-xs mt-3 mb-1">Style</Text>
          <View className="flex-row gap-2">
            {VARIANTS.map((v) => (
              <Pressable
                key={v.key}
                onPress={() => setSettings({ ...settings, variant: v.key })}
                className={`flex-1 rounded-xl px-3 py-2 border ${
                  settings.variant === v.key ? 'bg-gold border-gold' : 'border-border bg-surfaceMuted'
                }`}
              >
                <Text
                  className={`text-center text-xs font-semibold ${
                    settings.variant === v.key ? 'text-canvas' : 'text-text-muted'
                  }`}
                >
                  {v.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="items-end mt-3">
            <GoldButton label="Save banner" onPress={() => void save()} loading={saving} />
          </View>
        </>
      )}
    </GoldCard>
  );
}
