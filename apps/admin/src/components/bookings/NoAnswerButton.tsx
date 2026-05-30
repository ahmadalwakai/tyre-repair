import React, { useState } from 'react';
import { Modal, Pressable, Switch, Text, View } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldInput } from '@/components/ui/GoldInput';
import { useToast } from '@/components/ui/Toast';
import { useSingleFlightAction } from '@/hooks/useSingleFlightAction';
import { markBookingNoAnswer } from '@/lib/api/admin-efficiency';
import { ApiError } from '@/lib/api/client';

/**
 * Admin Efficiency Pack F1 — No-answer button + modal.
 *
 * Lets admin record that a customer didn't pick up the phone, optionally
 * sending a follow-up SMS and writing an internal "issue" note.
 */
export function NoAnswerButton({
  bookingId,
  onMarked,
}: {
  bookingId: string;
  onMarked?: () => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [sendSms, setSendSms] = useState(true);
  const [note, setNote] = useState('');
  const toast = useToast();

  const action = useSingleFlightAction(async () => {
    const body: { sendFollowUpSms?: boolean; note?: string } = { sendFollowUpSms: sendSms };
    if (note.trim()) body.note = note.trim();
    return markBookingNoAnswer(bookingId, body);
  });

  const submit = async (): Promise<void> => {
    const r = await action.run();
    if (!r) {
      if (action.error) {
        toast.error(action.error);
      }
      return;
    }
    if (r.alreadyMarkedRecently) {
      toast.info(
        `Already marked at ${r.lastMarkedAt ? new Date(r.lastMarkedAt).toLocaleTimeString() : 'recently'}`,
      );
    } else if (sendSms && !r.smsSent) {
      toast.warning(r.smsSkippedReason ? `SMS skipped: ${r.smsSkippedReason}` : 'SMS not sent');
    } else {
      toast.success(sendSms ? 'No-answer logged · SMS sent' : 'No-answer logged');
    }
    setOpen(false);
    setNote('');
    setSendSms(true);
    action.reset();
    onMarked?.();
  };

  return (
    <>
      <GoldButton label="No answer" variant="secondary" onPress={() => setOpen(true)} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-canvas/80 items-center justify-center p-4">
          <View className="w-full max-w-md rounded-2xl bg-surface border border-border p-4">
            <Text className="text-text font-semibold text-base mb-2">Customer didn't answer</Text>
            <Text className="text-text-muted text-xs mb-3">
              We'll log this and (optionally) send a polite SMS asking them to call back. The
              SMS body is fixed for compliance — it cannot be edited from here.
            </Text>

            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text">Send follow-up SMS</Text>
              <Switch
                value={sendSms}
                onValueChange={setSendSms}
                trackColor={{ false: '#2A2A33', true: '#8F0010' }}
                thumbColor={sendSms ? '#E30613' : '#6B6B75'}
              />
            </View>

            <GoldInput
              label="Internal note (optional)"
              placeholder="e.g. Voicemail full, will try later"
              value={note}
              onChangeText={setNote}
              multiline
            />

            <View className="flex-row justify-end gap-2 mt-4">
              <Pressable
                onPress={() => {
                  setOpen(false);
                  action.reset();
                }}
                className="px-4 py-3"
              >
                <Text className="text-text-muted">Cancel</Text>
              </Pressable>
              <GoldButton
                label="Record no-answer"
                onPress={() => void submit()}
                loading={action.isPending}
              />
            </View>
            {action.error ? (
              <Text className="text-danger text-xs mt-2">{action.error}</Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}
