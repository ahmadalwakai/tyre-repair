import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { getMessageTemplates } from '@/lib/api/admin-efficiency';
import type {
  AdminMessageTemplate,
  AdminMessageTemplateKey,
} from '@/types/admin-efficiency';
import { ApiError } from '@/lib/api/client';

/**
 * Admin Efficiency Pack F3 — Customer message templates picker.
 *
 * Loads templates, lets admin pick one, renders it for the booking, then
 * offers Copy / SMS / WhatsApp actions. Uses native Share for copy because
 * expo-clipboard is not installed.
 */
export function MessageTemplatePicker({
  bookingId,
  customerPhone,
  visible,
  onClose,
}: {
  bookingId: string;
  customerPhone: string | null;
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const [templates, setTemplates] = useState<AdminMessageTemplate[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<AdminMessageTemplateKey | null>(null);
  const [rendered, setRendered] = useState<string>('');
  const [renderingKey, setRenderingKey] = useState<AdminMessageTemplateKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    getMessageTemplates()
      .then((res) => setTemplates(res.templates))
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : 'Could not load templates'),
      );
  }, [visible]);

  const pick = async (key: AdminMessageTemplateKey): Promise<void> => {
    setSelectedKey(key);
    setRenderingKey(key);
    setRendered('');
    try {
      const res = await getMessageTemplates({ templateKey: key, bookingId });
      setRendered(res.renderedMessage ?? '');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not render template');
    } finally {
      setRenderingKey(null);
    }
  };

  const sendSms = async (): Promise<void> => {
    if (!customerPhone || !rendered) return;
    const url = `sms:${customerPhone}?body=${encodeURIComponent(rendered)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open SMS', 'Your device cannot open SMS links.');
    }
  };

  const sendWhatsApp = async (): Promise<void> => {
    if (!customerPhone || !rendered) return;
    const cleaned = customerPhone.replace(/[^\d+]/g, '');
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(rendered)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open WhatsApp', 'WhatsApp is not installed on this device.');
    }
  };

  const copy = async (): Promise<void> => {
    if (!rendered) return;
    try {
      await Share.share({ message: rendered });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-canvas/90 justify-end">
        <View className="bg-canvas rounded-t-2xl border-t border-border max-h-[90%]">
          <View className="flex-row items-center justify-between p-4 border-b border-border">
            <Text className="text-text font-semibold text-base">Send a message</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text className="text-gold font-semibold">Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
            {error ? <Text className="text-danger text-sm">{error}</Text> : null}
            {!templates ? (
              <Text className="text-text-muted">Loading templates…</Text>
            ) : (
              templates.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => void pick(t.key)}
                  className={`rounded-xl p-3 border ${
                    selectedKey === t.key
                      ? 'border-gold bg-surface'
                      : 'border-border bg-surfaceMuted'
                  }`}
                >
                  <Text className="text-text font-semibold text-sm">{t.label}</Text>
                  <Text className="text-text-dim text-xs mt-1">{t.description}</Text>
                </Pressable>
              ))
            )}

            {selectedKey ? (
              <GoldCard className="mt-3">
                <Text className="text-text-dim text-[10px] uppercase tracking-wide mb-1">
                  Preview
                </Text>
                {renderingKey ? (
                  <Text className="text-text-muted text-sm">Rendering…</Text>
                ) : rendered ? (
                  <Text className="text-text text-sm">{rendered}</Text>
                ) : (
                  <Text className="text-text-muted text-sm">No content</Text>
                )}
                <View className="flex-row flex-wrap gap-2 mt-3">
                  <GoldButton label="Copy / share" variant="secondary" onPress={() => void copy()} />
                  {customerPhone ? (
                    <>
                      <GoldButton label="SMS" variant="primary" onPress={() => void sendSms()} />
                      <GoldButton
                        label="WhatsApp"
                        variant="secondary"
                        onPress={() => void sendWhatsApp()}
                      />
                    </>
                  ) : null}
                </View>
                {!customerPhone ? (
                  <Text className="text-warning text-xs mt-2">
                    No phone number on file — copy and send manually.
                  </Text>
                ) : null}
              </GoldCard>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
