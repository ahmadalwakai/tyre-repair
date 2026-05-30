import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import { getMessageTemplates, updateMessageTemplate } from '@/lib/api/admin-efficiency';
import { ApiError } from '@/lib/api/client';
import type {
  AdminMessageTemplate,
  AdminMessageTemplateKey,
} from '@/types/admin-efficiency';

/**
 * Edit the customer-facing SMS / WhatsApp templates used in the Send-message
 * picker. Editing persists an override; clearing the field restores the
 * built-in default. Variables in `{curlyBraces}` are replaced at send time
 * (customerName, trackingLink, paymentLink, balanceLink, balanceDueGbp,
 * servicePhoneNumber, whatsappNumber).
 */
export function MessageTemplatesEditorPanel(): React.JSX.Element {
  const [templates, setTemplates] = useState<AdminMessageTemplate[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<AdminMessageTemplateKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async (): Promise<void> => {
    try {
      const res = await getMessageTemplates();
      setTemplates(res.templates);
      const seed: Record<string, string> = {};
      for (const t of res.templates) seed[t.key] = t.template;
      setDrafts(seed);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load templates');
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const save = async (key: AdminMessageTemplateKey, value: string): Promise<void> => {
    setSavingKey(key);
    try {
      const res = await updateMessageTemplate({ templateKey: key, template: value });
      setTemplates(res.templates);
      const next: Record<string, string> = {};
      for (const t of res.templates) next[t.key] = t.template;
      setDrafts(next);
      Alert.alert('Saved', 'Message template updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof ApiError ? e.message : 'Unknown error');
    } finally {
      setSavingKey(null);
    }
  };

  const reset = async (key: AdminMessageTemplateKey): Promise<void> => {
    setSavingKey(key);
    try {
      const res = await updateMessageTemplate({ templateKey: key, template: '' });
      setTemplates(res.templates);
      const next: Record<string, string> = {};
      for (const t of res.templates) next[t.key] = t.template;
      setDrafts(next);
      Alert.alert('Restored', 'Default template restored.');
    } catch (e) {
      Alert.alert('Could not restore', e instanceof ApiError ? e.message : 'Unknown error');
    } finally {
      setSavingKey(null);
    }
  };

  const list = useMemo(() => templates ?? [], [templates]);

  return (
    <GoldCard className="mb-3">
      <Text className="text-text font-semibold mb-1">Customer message templates</Text>
      <Text className="text-text-dim text-xs mb-3">
        Used by the Send-message picker on bookings. Variables in {'{braces}'} are filled
        per-customer at send time. Clear and save to restore the built-in default.
      </Text>
      {error ? <Text className="text-danger text-xs mb-2">{error}</Text> : null}
      {!templates ? (
        <Text className="text-text-muted">Loading…</Text>
      ) : (
        <ScrollView style={{ maxHeight: 520 }} nestedScrollEnabled>
          {list.map((t) => {
            const draft = drafts[t.key] ?? '';
            const dirty = draft !== t.template;
            return (
              <View key={t.key} className="mb-4 pb-3 border-b border-border">
                <Text className="text-text font-semibold">{t.label}</Text>
                <Text className="text-text-dim text-xs mb-1">{t.description}</Text>
                <Text className="text-text-muted text-xs mb-2">
                  Variables: {t.variables.map((v) => `{${v}}`).join(' ')}
                </Text>
                <GoldInput
                  label="Template body"
                  value={draft}
                  onChangeText={(v) => setDrafts((prev) => ({ ...prev, [t.key]: v }))}
                  multiline
                  autoCapitalize="sentences"
                />
                <View className="flex-row justify-end gap-2 mt-2">
                  <GoldButton
                    label="Restore default"
                    variant="secondary"
                    onPress={() => void reset(t.key)}
                    loading={savingKey === t.key}
                  />
                  <GoldButton
                    label={dirty ? 'Save changes' : 'Saved'}
                    onPress={() => void save(t.key, draft)}
                    loading={savingKey === t.key}
                    disabled={!dirty || savingKey === t.key}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </GoldCard>
  );
}
