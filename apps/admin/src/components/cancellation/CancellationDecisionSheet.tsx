import React, { useMemo, useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import {
  cancelBooking,
  type CancellationDepositDecision,
  type CancellationStage,
  type CancelBookingResponse,
} from '@/lib/api/financial-safety';
import { ApiError } from '@/lib/api/client';

interface Props {
  visible: boolean;
  bookingId: string;
  trackingId?: string | null;
  depositPaid?: boolean;
  depositAmountGbp?: string | null;
  onDismiss: () => void;
  onCancelled?: (response: CancelBookingResponse) => void;
}

const STAGES: Array<{ value: CancellationStage; label: string; help: string }> = [
  { value: 'before_dispatch', label: 'Before dispatch', help: 'No driver dispatched yet.' },
  { value: 'after_dispatch', label: 'After dispatch', help: 'Driver was dispatched.' },
  { value: 'on_site', label: 'On site', help: 'Driver arrived but work not yet started.' },
  { value: 'after_work_started', label: 'After work started', help: 'Work was already underway.' },
  { value: 'customer_no_show', label: 'Customer no-show', help: 'Customer was not present.' },
  { value: 'cannot_complete', label: 'Cannot complete', help: 'Could not safely complete the job.' },
];

const DECISIONS: Array<{ value: CancellationDepositDecision; label: string }> = [
  { value: 'not_applicable', label: 'No deposit / not applicable' },
  { value: 'retain_deposit', label: 'Retain deposit (per cancellation policy)' },
  { value: 'refund_deposit', label: 'Mark deposit for refund review' },
  { value: 'partial_refund', label: 'Mark partial refund for review' },
  { value: 'balance_due', label: 'Balance due — record outstanding amount' },
  { value: 'manual_review', label: 'Send to manual review' },
];

export function CancellationDecisionSheet(props: Props): React.JSX.Element {
  const { visible, bookingId, trackingId, depositPaid, depositAmountGbp, onDismiss, onCancelled } = props;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stage, setStage] = useState<CancellationStage>('before_dispatch');
  const [reason, setReason] = useState('');
  const [decision, setDecision] = useState<CancellationDepositDecision>(
    depositPaid ? 'retain_deposit' : 'not_applicable',
  );
  const [retained, setRetained] = useState(depositAmountGbp ?? '');
  const [refundDue, setRefundDue] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const decisionLocked = useMemo(
    () => depositPaid && decision === 'not_applicable',
    [depositPaid, decision],
  );

  const reset = () => {
    setStep(1);
    setReason('');
    setRetained(depositAmountGbp ?? '');
    setRefundDue('');
    setCustomerMessage('');
    setInternalNotes('');
    setDecision(depositPaid ? 'retain_deposit' : 'not_applicable');
    setStage('before_dispatch');
  };

  const onClose = () => {
    if (submitting) return;
    reset();
    onDismiss();
  };

  const onSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Please enter a brief reason for the cancellation.');
      return;
    }
    if (depositPaid && decision === 'not_applicable') {
      Alert.alert(
        'Deposit decision required',
        'A deposit has been paid. Choose retain / refund review / partial / balance due / manual review.',
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await cancelBooking(bookingId, {
        stage,
        reason: reason.trim(),
        depositDecision: decision,
        ...(retained.trim() ? { retainedAmountGbp: retained.trim() } : {}),
        ...(refundDue.trim() ? { refundDueGbp: refundDue.trim() } : {}),
        ...(customerMessage.trim() ? { customerMessage: customerMessage.trim() } : {}),
        ...(internalNotes.trim() ? { internalNotes: internalNotes.trim() } : {}),
      });
      Alert.alert(
        'Booking cancelled',
        `Status: cancelled\nDeposit decision: ${res.depositDecision}\nEmail: ${res.emailSent ? 'sent' : res.emailSkippedReason ?? 'skipped'}\n\nThis does NOT automatically process a Stripe refund — issue refunds manually in Stripe.`,
      );
      onCancelled?.(res);
      reset();
      onDismiss();
    } catch (e) {
      Alert.alert('Could not cancel', e instanceof ApiError ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-canvas">
        <View className="px-4 pt-4 pb-2 border-b border-border">
          <Text className="text-text text-lg font-semibold">Cancel booking</Text>
          {trackingId ? <Text className="text-text-muted text-xs mt-1">{trackingId}</Text> : null}
          <Text className="text-text-muted text-xs mt-1">Step {step} of 3</Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {step === 1 ? (
            <GoldCard>
              <Text className="text-text font-semibold mb-2">When is this being cancelled?</Text>
              {STAGES.map((s) => (
                <Pressable
                  key={s.value}
                  onPress={() => setStage(s.value)}
                  className={`rounded-xl p-3 mb-2 border ${stage === s.value ? 'border-gold bg-surfaceMuted' : 'border-border'}`}
                >
                  <Text className="text-text font-semibold">{s.label}</Text>
                  <Text className="text-text-muted text-xs mt-1">{s.help}</Text>
                </Pressable>
              ))}
              <View className="mt-3">
                <Text className="text-text font-semibold mb-1">Reason (short)</Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="e.g. Customer requested cancellation"
                  placeholderTextColor="#6b6b75"
                  className="bg-surfaceMuted rounded-xl px-3 py-3 text-text border border-border"
                />
              </View>
            </GoldCard>
          ) : null}

          {step === 2 ? (
            <GoldCard>
              <Text className="text-text font-semibold mb-2">Deposit decision</Text>
              {depositPaid ? (
                <Text className="text-warning text-xs mb-2">
                  A deposit of £{depositAmountGbp ?? '0.00'} is on file. You must choose a deposit decision.
                </Text>
              ) : (
                <Text className="text-text-muted text-xs mb-2">No deposit on file.</Text>
              )}
              {DECISIONS.map((d) => {
                const isHidden = !depositPaid && d.value !== 'not_applicable';
                if (isHidden && d.value !== 'manual_review') return null;
                return (
                  <Pressable
                    key={d.value}
                    onPress={() => setDecision(d.value)}
                    className={`rounded-xl p-3 mb-2 border ${decision === d.value ? 'border-gold bg-surfaceMuted' : 'border-border'}`}
                  >
                    <Text className="text-text">{d.label}</Text>
                  </Pressable>
                );
              })}
              {(decision === 'retain_deposit' || decision === 'partial_refund') ? (
                <View className="mt-2">
                  <Text className="text-text font-semibold mb-1">Retained amount (£)</Text>
                  <TextInput
                    value={retained}
                    onChangeText={setRetained}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#6b6b75"
                    className="bg-surfaceMuted rounded-xl px-3 py-3 text-text border border-border"
                  />
                </View>
              ) : null}
              {(decision === 'refund_deposit' || decision === 'partial_refund' || decision === 'manual_review') ? (
                <View className="mt-2">
                  <Text className="text-text font-semibold mb-1">Refund marked for review (£)</Text>
                  <TextInput
                    value={refundDue}
                    onChangeText={setRefundDue}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#6b6b75"
                    className="bg-surfaceMuted rounded-xl px-3 py-3 text-text border border-border"
                  />
                </View>
              ) : null}
              <View className="mt-3 rounded-xl bg-surfaceMuted p-3 border border-border">
                <Text className="text-warning text-xs">
                  This does NOT automatically process a Stripe refund. Issue refunds manually inside Stripe after review.
                </Text>
              </View>
            </GoldCard>
          ) : null}

          {step === 3 ? (
            <GoldCard>
              <Text className="text-text font-semibold mb-2">Customer message (optional)</Text>
              <TextInput
                value={customerMessage}
                onChangeText={setCustomerMessage}
                placeholder="Calm wording — this will appear in the cancellation email."
                placeholderTextColor="#6b6b75"
                multiline
                numberOfLines={4}
                className="bg-surfaceMuted rounded-xl px-3 py-3 text-text border border-border"
              />
              <Text className="text-text font-semibold mt-3 mb-2">Internal notes (private)</Text>
              <TextInput
                value={internalNotes}
                onChangeText={setInternalNotes}
                placeholder="Notes for the admin audit trail. NOT shown to customer."
                placeholderTextColor="#6b6b75"
                multiline
                numberOfLines={4}
                className="bg-surfaceMuted rounded-xl px-3 py-3 text-text border border-border"
              />
              <View className="mt-3 rounded-xl bg-surfaceMuted p-3 border border-border">
                <Text className="text-text-muted text-xs">Stage: {stage}</Text>
                <Text className="text-text-muted text-xs">Reason: {reason || '—'}</Text>
                <Text className="text-text-muted text-xs">Deposit decision: {decision}</Text>
                {retained ? <Text className="text-text-muted text-xs">Retained: £{retained}</Text> : null}
                {refundDue ? <Text className="text-text-muted text-xs">Refund review: £{refundDue}</Text> : null}
              </View>
            </GoldCard>
          ) : null}
        </ScrollView>

        <View className="px-4 py-3 border-t border-border flex-row gap-2">
          <View className="flex-1">
            <GoldButton
              label={step === 1 ? 'Cancel' : 'Back'}
              variant="secondary"
              onPress={() => {
                if (step === 1) onClose();
                else setStep((step - 1) as 1 | 2 | 3);
              }}
              disabled={submitting}
            />
          </View>
          <View className="flex-1">
            <GoldButton
              label={step < 3 ? 'Next' : 'Cancel booking'}
              variant={step < 3 ? 'primary' : 'danger'}
              loading={submitting}
              disabled={step === 1 ? !reason.trim() : !!decisionLocked}
              onPress={() => {
                if (step < 3) setStep((step + 1) as 1 | 2 | 3);
                else void onSubmit();
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
