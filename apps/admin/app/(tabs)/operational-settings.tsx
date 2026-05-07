import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { PromoBannerSettingsPanel } from '@/components/settings/PromoBannerSettingsPanel';
import { ServiceAvailabilityPanel } from '@/components/settings/ServiceAvailabilityPanel';
import {
  getOperationalSettings,
  updateOperationalSettings,
} from '@/lib/api/operations-settings';
import type { OperationalSettings } from '@/types/operations-settings';
import { ApiError } from '@/lib/api/client';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const inputClass =
  'bg-canvas border border-border rounded-md px-3 py-2 text-text mt-1';

function Field({
  label,
  value,
  onChange,
  keyboardType = 'default',
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'url';
  hint?: string;
}): React.JSX.Element {
  return (
    <View className="mb-3">
      <Text className="text-text-muted text-xs uppercase tracking-wide">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholderTextColor="#6B6B75"
        className={inputClass}
      />
      {hint ? <Text className="text-text-dim text-xs mt-1">{hint}</Text> : null}
    </View>
  );
}

export default function OperationalSettingsScreen(): React.JSX.Element {
  const { online } = useNetworkStatus();
  const [data, setData] = useState<OperationalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getOperationalSettings();
      setData(res.settings);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    if (!data || !online) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateOperationalSettings(data);
      setData(res.settings);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }, [data, online]);

  return (
    <AppShell>
      <OfflineBanner />
      <ScreenHeader title="Operational settings" />
      {loading ? (
        <LoadingState label="Loading settings…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? null : (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <GoldCard>
            <Field
              label="Emergency assessment fee (£)"
              value={data.emergencyAssessmentFeeGbp}
              onChange={(v) => setData({ ...data, emergencyAssessmentFeeGbp: v })}
              keyboardType="numeric"
            />
            <Field
              label="Deposit percentage"
              value={String(data.depositPercentage)}
              onChange={(v) => setData({ ...data, depositPercentage: Number(v) || 0 })}
              keyboardType="numeric"
              hint="Whole number 1–50"
            />
            <Field
              label="Service phone"
              value={data.servicePhoneNumber}
              onChange={(v) => setData({ ...data, servicePhoneNumber: v })}
              keyboardType="phone-pad"
            />
            <Field
              label="WhatsApp number"
              value={data.whatsappNumber}
              onChange={(v) => setData({ ...data, whatsappNumber: v })}
              keyboardType="phone-pad"
            />
            <Field
              label="Low stock threshold"
              value={String(data.lowStockThreshold)}
              onChange={(v) => setData({ ...data, lowStockThreshold: Number(v) || 0 })}
              keyboardType="numeric"
            />
            <Field
              label="Special order message"
              value={data.specialOrderMessage}
              onChange={(v) => setData({ ...data, specialOrderMessage: v })}
            />
            <Field
              label="Cancellation policy URL"
              value={data.cancellationPolicyUrl}
              onChange={(v) => setData({ ...data, cancellationPolicyUrl: v })}
              keyboardType="url"
            />

            {error ? <Text className="text-danger mb-2">{error}</Text> : null}
            {savedAt ? (
              <Text className="text-success mb-2">Saved at {savedAt}</Text>
            ) : null}

            <GoldButton
              label={saving ? 'Saving…' : 'Save settings'}
              variant="primary"
              loading={saving}
              disabled={saving || !online}
              onPress={() => {
                void save();
              }}
            />
          </GoldCard>

          {/* Admin Efficiency Pack F10 — Promo banner */}
          <View className="mt-3">
            <PromoBannerSettingsPanel />
          </View>

          {/* Admin Efficiency Pack F11 — Service availability */}
          <View>
            <ServiceAvailabilityPanel />
          </View>
        </ScrollView>
      )}
    </AppShell>
  );
}
