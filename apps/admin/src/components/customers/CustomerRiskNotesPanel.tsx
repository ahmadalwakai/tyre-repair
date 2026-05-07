import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import {
  createRiskNote,
  listRiskNotes,
  updateRiskNote,
} from '@/lib/api/admin-efficiency';
import { ApiError } from '@/lib/api/client';
import type { RiskNote, RiskNoteType } from '@/types/admin-efficiency';

const NOTE_TYPES: { key: RiskNoteType; label: string }[] = [
  { key: 'GENERAL_NOTE', label: 'General' },
  { key: 'REPEATED_NO_ANSWER', label: 'No answer' },
  { key: 'PREVIOUS_NO_SHOW', label: 'No show' },
  { key: 'PREFERS_WHATSAPP', label: 'WhatsApp' },
  { key: 'NEEDS_LOCATION_CONFIRMATION', label: 'Location' },
  { key: 'PAYMENT_SENSITIVE', label: 'Payment' },
];

/**
 * Admin Efficiency Pack F8 — Customer risk notes panel.
 *
 * Pulls + writes notes scoped by phone (preferred) or customerId.
 */
export function CustomerRiskNotesPanel({
  customerPhone,
  customerId,
}: {
  customerPhone: string | null;
  customerId?: string | null;
}): React.JSX.Element | null {
  const [notes, setNotes] = useState<RiskNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [noteType, setNoteType] = useState<RiskNoteType>('GENERAL_NOTE');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!customerPhone && !customerId) return;
    setError(null);
    try {
      const params: { customerPhone?: string; customerId?: string } = {};
      if (customerPhone) params.customerPhone = customerPhone;
      else if (customerId) params.customerId = customerId;
      const res = await listRiskNotes(params);
      setNotes(res.notes);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load risk notes');
    }
  }, [customerPhone, customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!customerPhone && !customerId) return null;

  const submit = async (): Promise<void> => {
    if (!body.trim() || !customerPhone) return;
    setSubmitting(true);
    try {
      const payload: Parameters<typeof createRiskNote>[0] = {
        customerPhone,
        noteType,
        body: body.trim(),
      };
      if (customerId) payload.customerId = customerId;
      await createRiskNote(payload);
      setBody('');
      setNoteType('GENERAL_NOTE');
      await load();
    } catch (e) {
      Alert.alert('Could not save', e instanceof ApiError ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const archive = (note: RiskNote): void => {
    Alert.alert('Archive note?', 'It will be hidden from this list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateRiskNote(note.id, { archived: true });
            await load();
          } catch (e) {
            Alert.alert('Could not archive', e instanceof ApiError ? e.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  return (
    <GoldCard className="mb-3">
      <Text className="text-text font-semibold mb-2">Customer risk notes</Text>
      <Text className="text-text-dim text-[10px] mb-2">
        Stored against phone — visible on every booking for this customer.
      </Text>
      {error ? <Text className="text-danger text-xs mb-2">{error}</Text> : null}

      {customerPhone ? (
        <View className="bg-surfaceMuted rounded-xl p-3 mb-3">
          <GoldInput
            placeholder="e.g. Always confirm location before dispatch"
            value={body}
            onChangeText={setBody}
            multiline
          />
          <View className="flex-row flex-wrap gap-1 mt-2">
            {NOTE_TYPES.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setNoteType(t.key)}
                className={`rounded-full px-3 py-1 border ${
                  noteType === t.key ? 'bg-gold border-gold' : 'border-border bg-canvas'
                }`}
              >
                <Text
                  className={`text-[10px] font-semibold ${
                    noteType === t.key ? 'text-canvas' : 'text-text-muted'
                  }`}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="items-end mt-2">
            <GoldButton
              label="Add risk note"
              onPress={() => void submit()}
              loading={submitting}
              disabled={!body.trim()}
            />
          </View>
        </View>
      ) : null}

      {!notes ? (
        <Text className="text-text-muted text-xs">Loading…</Text>
      ) : notes.length === 0 ? (
        <Text className="text-text-dim text-xs">No risk notes for this customer.</Text>
      ) : (
        notes.map((n) => (
          <View key={n.id} className="border-b border-border py-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-warning text-[10px] uppercase tracking-wide">
                {n.noteType.replace(/_/g, ' ')}
              </Text>
              <Pressable onPress={() => archive(n)} hitSlop={8}>
                <Text className="text-text-dim text-[10px]">Archive</Text>
              </Pressable>
            </View>
            <Text className="text-text text-sm mt-1">{n.body}</Text>
            <Text className="text-text-dim text-[10px] mt-1">
              {new Date(n.createdAt).toLocaleString()}
              {n.authorName ? ` · ${n.authorName}` : n.authorEmail ? ` · ${n.authorEmail}` : ''}
            </Text>
          </View>
        ))
      )}
    </GoldCard>
  );
}
