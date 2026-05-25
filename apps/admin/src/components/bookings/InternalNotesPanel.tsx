import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import { useToast } from '@/components/ui/Toast';
import { NoteTemplateChips } from '@/components/notes/NoteTemplateChips';
import {
  createInternalNote,
  deleteInternalNote,
  listInternalNotes,
  updateInternalNote,
} from '@/lib/api/admin-efficiency';
import { ApiError } from '@/lib/api/client';
import type { InternalNote, InternalNoteType } from '@/types/admin-efficiency';

const NOTE_TYPES: { key: InternalNoteType; label: string }[] = [
  { key: 'GENERAL', label: 'General' },
  { key: 'CUSTOMER_INFO', label: 'Customer' },
  { key: 'PAYMENT_INFO', label: 'Payment' },
  { key: 'LOCATION_INFO', label: 'Location' },
  { key: 'TYRE_INFO', label: 'Tyre' },
  { key: 'DISPATCH_NOTE', label: 'Dispatch' },
  { key: 'ISSUE', label: 'Issue' },
];

/**
 * Admin Efficiency Pack F5 — Internal job notes panel.
 */
export function InternalNotesPanel({
  bookingId,
}: {
  bookingId: string;
}): React.JSX.Element {
  const [notes, setNotes] = useState<InternalNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [noteType, setNoteType] = useState<InternalNoteType>('GENERAL');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listInternalNotes(bookingId);
      setNotes(res.notes);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load notes');
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (): Promise<void> => {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await createInternalNote(bookingId, { body: body.trim(), noteType, pinned });
      setBody('');
      setPinned(false);
      setNoteType('GENERAL');
      toast.success('Note saved');
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save note');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePin = async (note: InternalNote): Promise<void> => {
    try {
      await updateInternalNote(bookingId, note.id, { pinned: !note.pinned });
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not update note');
    }
  };

  const remove = (note: InternalNote): void => {
    Alert.alert('Delete note?', 'This cannot be undone from the app.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteInternalNote(bookingId, note.id);
            toast.success('Note deleted');
            await load();
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : 'Could not delete note');
          }
        },
      },
    ]);
  };

  return (
    <GoldCard className="mb-3">
      <Text className="text-text font-semibold mb-2">Internal notes</Text>
      {error ? <Text className="text-danger text-xs mb-2">{error}</Text> : null}

      {/* New note form */}
      <View className="bg-surfaceMuted rounded-xl p-3 mb-3">
        <GoldInput
          placeholder="Add an internal note…"
          value={body}
          onChangeText={setBody}
          multiline
        />
        <NoteTemplateChips
          disabled={submitting}
          onPick={(template) =>
            setBody((prev) =>
              prev.trim().length === 0
                ? template
                : `${prev.trimEnd()}\n${template}`,
            )
          }
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
        <View className="flex-row items-center justify-between mt-2">
          <Pressable
            onPress={() => setPinned((p) => !p)}
            className="flex-row items-center"
            hitSlop={8}
          >
            <View
              className={`w-4 h-4 rounded border mr-2 ${
                pinned ? 'bg-gold border-gold' : 'border-border bg-canvas'
              }`}
            />
            <Text className="text-text-muted text-xs">Pin to top</Text>
          </Pressable>
          <GoldButton
            label="Add note"
            onPress={() => void submit()}
            loading={submitting}
            disabled={!body.trim()}
          />
        </View>
      </View>

      {/* List */}
      {!notes ? (
        <Text className="text-text-muted text-xs">Loading…</Text>
      ) : notes.length === 0 ? (
        <Text className="text-text-dim text-xs">No internal notes yet.</Text>
      ) : (
        notes.map((n) => (
          <View key={n.id} className="border-b border-border py-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                {n.pinned ? <Text className="text-gold text-xs mr-2">📌</Text> : null}
                <Text className="text-text-dim text-[10px] uppercase tracking-wide">
                  {n.noteType.replace(/_/g, ' ')}
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Pressable onPress={() => void togglePin(n)} hitSlop={8}>
                  <Text className="text-gold text-[10px]">{n.pinned ? 'Unpin' : 'Pin'}</Text>
                </Pressable>
                <Pressable onPress={() => remove(n)} hitSlop={8}>
                  <Text className="text-danger text-[10px]">Delete</Text>
                </Pressable>
              </View>
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
