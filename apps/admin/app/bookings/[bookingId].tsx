import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { AdminButton } from '@/components/ui/AdminButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { PaymentRiskCard } from '@/components/payments/PaymentRiskCard';
import { BookingLocationCard } from '@/components/bookings/BookingLocationCard';
import { BookingHealthCard } from '@/components/bookings/BookingHealthCard';
import { InternalNotesPanel } from '@/components/bookings/InternalNotesPanel';
import { BookingPricingAuditPanel } from '@/components/bookings/BookingPricingAuditPanel';
import { BookingAttachmentsPanel } from '@/components/bookings/BookingAttachmentsPanel';
import { BuyTyresDetailsPanel } from '@/components/bookings/BuyTyresDetailsPanel';
import { NoAnswerButton } from '@/components/bookings/NoAnswerButton';
import { CopySummaryButton } from '@/components/bookings/CopySummaryButton';
import { WhatsAppShareButton } from '@/components/bookings/WhatsAppShareButton';
import { SendLocationRequestButton } from '@/components/bookings/SendLocationRequestButton';
import { CustomerRiskNotesPanel } from '@/components/customers/CustomerRiskNotesPanel';
import { MessageTemplatePicker } from '@/components/messages/MessageTemplatePicker';
import { getBookingDetail } from '@/lib/api/bookings';
import {
  sendBookingPaymentLinkWithConfirm,
  sendBookingBalanceLinkWithConfirm,
} from '@/lib/send-payment-link';
import { ApiError } from '@/lib/api/client';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { runIfOnline } from '@/lib/offline-guard';
import { useToast } from '@/components/ui/Toast';
import type { BookingDetailExtended } from '@/types/bookings';

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <GoldCard className="mb-3">
      <Text className="text-text font-semibold mb-2">{title}</Text>
      {children}
    </GoldCard>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-text-dim text-xs">{label}</Text>
      <Text className="text-text text-xs ml-3 flex-1 text-right">{value}</Text>
    </View>
  );
}

export default function BookingDetailScreen(): React.JSX.Element {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { online } = useNetworkStatus();
  const [data, setData] = useState<BookingDetailExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messagePickerOpen, setMessagePickerOpen] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) return;
    setError(null);
    try {
      const res = await getBookingDetail(bookingId);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load booking');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toast = useToast();

  const onSendBookingLink = runIfOnline(online, async (method: 'sms' | 'email') => {
    if (!bookingId) return;
    try {
      const r = await sendBookingPaymentLinkWithConfirm(bookingId, {
        method,
        paymentPurpose: 'booking',
      });
      if (r && !r.alreadySentRecently) {
        toast.success(`Payment link sent via ${method.toUpperCase()}`);
        void load();
      } else if (r?.alreadySentRecently) {
        toast.info('Link was already sent recently');
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not send link');
    }
  });

  const onSendBalanceLink = runIfOnline(online, async (method: 'sms' | 'email') => {
    if (!bookingId) return;
    try {
      const r = await sendBookingBalanceLinkWithConfirm(bookingId, method);
      if (r && !r.alreadySentRecently) {
        toast.success(`Balance link sent via ${method.toUpperCase()}`);
        void load();
      } else if (r?.alreadySentRecently) {
        toast.info('Link was already sent recently');
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not send link');
    }
  });

  return (
    <AppShell>
      <Stack.Screen options={{ title: 'Booking', headerShown: false }} />
      <OfflineBanner />
      <ScreenHeader
        title={data ? data.booking.trackingId : 'Booking'}
        subtitle={data ? data.customer.name ?? '—' : ''}
        right={
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/bookings');
              }
            }}
          >
            <Text className="text-gold font-semibold px-3 py-1">← Back</Text>
          </Pressable>
        }
      />

      {loading ? (
        <LoadingState label="Loading booking…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? null : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor="#E30613"
            />
          }
        >
          {/* Status header */}
          <GoldCard className="mb-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-text-dim text-[10px] uppercase tracking-wide">
                  {data.booking.jobType}
                </Text>
                <Text className="text-text font-semibold text-base mt-1">
                  {data.tyre
                    ? `${data.tyre.brand} ${data.tyre.model} ${data.tyre.sizeLabel}`
                    : data.booking.jobType === 'ASSESSMENT'
                      ? 'Emergency assessment'
                      : 'No tyre selected'}
                </Text>
              </View>
              <StatusBadge status={data.booking.status} />
            </View>
          </GoldCard>

          {/* Item 9 — Payment risk */}
          <PaymentRiskCard risk={data.paymentRisk} />

          {/* Buy Tyres scheduled-fitting panel — only shown for tyre_shop bookings. */}
          <BuyTyresDetailsPanel detail={data} />

          {/* Admin Efficiency Pack F2 — Booking health score */}
          <BookingHealthCard health={data.healthScore} />

          {/* Admin Efficiency Pack F1/F4/F13 — Quick admin actions */}
          <GoldCard className="mb-3">
            <Text className="text-text font-semibold mb-3">Quick actions</Text>
            {data.customer.phone ? (
              <View className="mb-3">
                <AdminButton
                  label={`Call ${data.customer.phone}`}
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={() => void Linking.openURL(`tel:${data.customer.phone!}`)}
                />
              </View>
            ) : null}
            <View className="flex-row flex-wrap gap-2">
              {bookingId ? <NoAnswerButton bookingId={bookingId} onMarked={load} /> : null}
              <CopySummaryButton detail={data} />
              <WhatsAppShareButton detail={data} />
              {bookingId ? (
                <SendLocationRequestButton
                  bookingId={bookingId}
                  hasGpsLocation={data.safetySummary.hasGpsLocation}
                  onSent={load}
                />
              ) : null}
              <GoldButton
                label="Message customer"
                variant="secondary"
                onPress={() => setMessagePickerOpen(true)}
              />
            </View>
          </GoldCard>

          {/* Item 18 — Mapbox location */}
          {bookingId ? <BookingLocationCard bookingId={bookingId} /> : null}

          {/* Customer */}
          <Section title="Customer">
            <Row label="Name" value={data.customer.name ?? '—'} />
            <Row
              label="Phone"
              value={
                data.customer.phone ? (
                  <Text
                    className="text-gold"
                    onPress={() => void Linking.openURL(`tel:${data.customer.phone!}`)}
                  >
                    {data.customer.phone}
                  </Text>
                ) : (
                  '—'
                )
              }
            />
            <Row label="Email" value={data.customer.email ?? '—'} />
          </Section>

          {/* Safety */}
          <Section title="Safety summary">
            <Row label="Locking nut" value={data.safetySummary.lockingWheelNutStatus} />
            {data.safetySummary.lockingNutWarning ? (
              <Text className="text-danger text-xs mt-1">{data.safetySummary.lockingNutWarning}</Text>
            ) : null}
            <Row label="GPS pin" value={data.safetySummary.hasGpsLocation ? 'Yes' : 'No'} />
            <Row label="Address" value={data.safetySummary.hasAddress ? 'Yes' : 'No'} />
            <Row label="Notes" value={data.safetySummary.notesPresent ? 'Yes' : 'No'} />
          </Section>

          {/* Send payment links */}
          {data.paymentRisk?.canSendPaymentLink || data.paymentRisk?.canSendBalanceLink ? (
            <Section title="Send payment link">
              <View className="flex-row flex-wrap gap-2">
                {data.paymentRisk?.canSendPaymentLink ? (
                  <>
                    <GoldButton
                      label="📱 SMS"
                      variant="secondary"
                      disabled={!online}
                      onPress={() => void onSendBookingLink('sms')}
                    />
                    <GoldButton
                      label="✉️ Email"
                      variant="secondary"
                      disabled={!online}
                      onPress={() => void onSendBookingLink('email')}
                    />
                  </>
                ) : null}
                {data.paymentRisk?.canSendBalanceLink ? (
                  <>
                    <GoldButton
                      label="📱 Balance SMS"
                      variant="primary"
                      disabled={!online}
                      onPress={() => void onSendBalanceLink('sms')}
                    />
                    <GoldButton
                      label="✉️ Balance email"
                      variant="primary"
                      disabled={!online}
                      onPress={() => void onSendBalanceLink('email')}
                    />
                  </>
                ) : null}
              </View>
            </Section>
          ) : null}

          {/* Adjustments */}
          {data.adjustments.length > 0 ? (
            <Section title="Adjustments">
              {data.adjustments.map((a) => (
                <View key={a.id} className="py-2 border-b border-border">
                  <View className="flex-row justify-between">
                    <Text className="text-text font-semibold text-xs">{a.type}</Text>
                    <Text className="text-text-muted text-xs">{a.status}</Text>
                  </View>
                  {a.additionalAmountGbp ? (
                    <Text className="text-gold text-xs mt-1">
                      Additional due £{a.additionalAmountGbp}
                    </Text>
                  ) : null}
                  {a.notes ? <Text className="text-text-dim text-xs mt-1">{a.notes}</Text> : null}
                </View>
              ))}
            </Section>
          ) : null}

          {/* Cancellation */}
          {data.cancellation ? (
            <Section title="Cancellation">
              <Row label="Stage" value={data.cancellation.stage ?? '—'} />
              <Row label="Reason" value={data.cancellation.reason ?? '—'} />
              <Row label="Deposit" value={data.cancellation.depositDecision ?? '—'} />
              {data.cancellation.retainedAmountGbp ? (
                <Row label="Retained" value={`£${data.cancellation.retainedAmountGbp}`} />
              ) : null}
              {data.cancellation.refundDueGbp ? (
                <Row label="Refund due" value={`£${data.cancellation.refundDueGbp}`} />
              ) : null}
              {data.cancellation.customerMessage ? (
                <Text className="text-text-muted text-xs mt-2">
                  {data.cancellation.customerMessage}
                </Text>
              ) : null}
            </Section>
          ) : null}

          {/* Timeline */}
          {data.timeline.length > 0 ? (
            <Section title="Timeline">
              {data.timeline.map((t, i) => (
                <View key={`${t.createdAt}-${i}`} className="py-1.5 border-b border-border">
                  <Text className="text-text text-xs">
                    {t.fromStatus ? `${t.fromStatus} → ` : ''}
                    <Text className="text-gold">{t.toStatus}</Text>
                  </Text>
                  <Text className="text-text-dim text-[10px] mt-0.5">
                    {new Date(t.createdAt).toLocaleString()}
                  </Text>
                  {t.message ? (
                    <Text className="text-text-muted text-xs mt-1">{t.message}</Text>
                  ) : null}
                </View>
              ))}
            </Section>
          ) : null}

          {/* Contact history */}
          {data.contactHistory.length > 0 ? (
            <Section title="Contact history">
              {data.contactHistory.slice(0, 20).map((c) => (
                <View key={c.id} className="py-1.5 border-b border-border">
                  <Text className="text-text text-xs">{c.action}</Text>
                  <Text className="text-text-dim text-[10px] mt-0.5">
                    {new Date(c.createdAt).toLocaleString()}
                    {c.actorLabel ? ` · ${c.actorLabel}` : ''}
                  </Text>
                </View>
              ))}
            </Section>
          ) : null}

          {/* Admin Efficiency Pack F5 — Internal notes */}
          {bookingId ? <InternalNotesPanel bookingId={bookingId} /> : null}

          {/* Admin Operations Completion Pack — pricing decisions audit */}
          {bookingId ? <BookingPricingAuditPanel bookingId={bookingId} /> : null}

          {/* Admin Stability & Field Operations Pack — Part 3 — attachments */}
          {bookingId ? <BookingAttachmentsPanel bookingId={bookingId} /> : null}

          {/* Admin Efficiency Pack F8 — Customer risk notes */}
          <CustomerRiskNotesPanel customerPhone={data.customer.phone} />
        </ScrollView>
      )}

      {/* Admin Efficiency Pack F3 — Message templates picker */}
      {bookingId ? (
        <MessageTemplatePicker
          bookingId={bookingId}
          customerPhone={data?.customer.phone ?? null}
          visible={messagePickerOpen}
          onClose={() => setMessagePickerOpen(false)}
        />
      ) : null}
    </AppShell>
  );
}
