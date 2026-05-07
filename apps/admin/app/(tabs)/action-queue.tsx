import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { SkeletonCardList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { getActionQueue } from '@/lib/api/action-queue';
import { acknowledgeCallClick } from '@/lib/api/call-click-events';
import { cancelPendingBooking, sendRecoverySms } from '@/lib/api/booking-recovery';
import { useToast } from '@/components/ui/Toast';
import {
  actionKindLabel,
  formatUkPhoneForDisplay,
  severityLabel,
  timeAgo,
} from '@/lib/format/labels';
import type { ActionItem, ActionQueueResponse } from '@/types/command-center';
import { ApiError } from '@/lib/api/client';
import { PricingReviewSection } from '@/components/action-queue/PricingReviewSection';

interface ActionRowProps {
  item: ActionItem;
  onHandled: () => void;
}

function ActionRow({ item, onHandled }: ActionRowProps): React.JSX.Element {
  const toast = useToast();
  const isRecheck = item.kind === 'smart_recheck';
  const isEmergency = item.kind === 'emergency_assist_started';
  const isCallClick = item.kind === 'website_call_clicked';
  const isInProgress = item.kind === 'booking_in_progress';
  const isAbandoned = item.kind === 'booking_abandoned';
  const isCheckoutKind = isInProgress || isAbandoned;
  const isPricingReview = item.kind === 'pricing_review_required';

  const openCallClickQuickBooking = (): void => {
    if (!isCallClick) return;
    if (item.callClickEventId) {
      void acknowledgeCallClick(item.callClickEventId, 'OPENED_QUICK_BOOKING').catch(() => {
        // best effort
      });
    }
    const params = new URLSearchParams();
    if (item.phone) params.set('phone', item.phone);
    if (item.customerName) params.set('customerName', item.customerName);
    if (item.tyreProblemType) params.set('tyreProblemType', item.tyreProblemType);
    if (item.jobType) params.set('jobType', item.jobType);
    if (item.sourcePage) params.set('prefillSource', item.sourcePage);
    if (item.callClickEventId) params.set('callClickEventId', item.callClickEventId);
    const qs = params.toString();
    router.push(qs ? (`/quick-booking?${qs}` as never) : ('/quick-booking' as never));
    onHandled();
  };

  const dismissCallClick = (): void => {
    if (!isCallClick || !item.callClickEventId) return;
    void acknowledgeCallClick(item.callClickEventId, 'DISMISSED')
      .catch(() => {
        // best effort
      })
      .finally(onHandled);
  };

  const callCustomerFromCallClick = (): void => {
    if (!isCallClick || !item.phone) return;
    if (item.callClickEventId) {
      void acknowledgeCallClick(item.callClickEventId, 'CALLED_CUSTOMER').catch(() => {
        // best effort
      });
    }
    void Linking.openURL(`tel:${item.phone}`);
    onHandled();
  };

  const tone =
    item.severity === 'DANGER'
      ? 'danger'
      : item.severity === 'WARNING'
        ? 'warning'
        : isEmergency || isCallClick
          ? 'gold'
          : 'info';
  const icon = isEmergency
    ? '🚨'
    : isCallClick
      ? '📞'
      : isAbandoned
        ? '⚠'
        : isInProgress
          ? '⏳'
          : isRecheck
            ? '🔄'
            : item.severity === 'DANGER'
              ? '⚠'
              : item.severity === 'WARNING'
                ? '!'
                : 'ℹ';

  return (
    <GoldCard
      className="mb-3"
      tone={tone}
      priority={item.severity === 'DANGER' || isEmergency ? 'high' : 'normal'}
      icon={icon}
      eyebrow={`${severityLabel(item.severity)} · ${actionKindLabel(item.kind)}`}
      title={item.title}
      headerRight={
        item.amountGbp ? (
          <Text className="text-gold font-bold text-lg">£{item.amountGbp}</Text>
        ) : null
      }
    >
      <View className="flex-row items-center gap-2 flex-wrap mb-2">
        {isRecheck ? (
          <View className="rounded-full bg-warning/20 px-2 py-0.5">
            <Text className="text-warning text-[10px] font-semibold">RECHECK</Text>
          </View>
        ) : null}
        {isEmergency ? (
          <View className="rounded-full bg-gold/25 px-2 py-0.5">
            <Text className="text-gold text-[10px] font-semibold">EMERGENCY</Text>
          </View>
        ) : null}
        {isCallClick ? (
          <View className="rounded-full bg-gold/25 px-2 py-0.5">
            <Text className="text-gold text-[10px] font-semibold">WEBSITE CALL</Text>
          </View>
        ) : null}
        {isInProgress ? (
          <View className="rounded-full bg-warning/20 px-2 py-0.5">
            <Text className="text-warning text-[10px] font-semibold">IN CHECKOUT</Text>
          </View>
        ) : null}
        {isAbandoned ? (
          <View className="rounded-full bg-danger/25 px-2 py-0.5">
            <Text className="text-danger text-[10px] font-semibold">ABANDONED</Text>
          </View>
        ) : null}
        {isPricingReview ? (
          <View
            className={`rounded-full px-2 py-0.5 ${
              item.pricingRiskLevel === 'BLOCK_PUBLIC_PAYMENT'
                ? 'bg-danger/25'
                : item.pricingRiskLevel === 'HIGH_RISK'
                  ? 'bg-danger/20'
                  : 'bg-warning/20'
            }`}
          >
            <Text
              className={`text-[10px] font-semibold ${
                item.pricingRiskLevel === 'BLOCK_PUBLIC_PAYMENT' ||
                item.pricingRiskLevel === 'HIGH_RISK'
                  ? 'text-danger'
                  : 'text-warning'
              }`}
            >
              {item.pricingRiskLevel === 'BLOCK_PUBLIC_PAYMENT'
                ? 'CALL-FIRST'
                : item.pricingRiskLevel === 'HIGH_RISK'
                  ? 'HIGH RISK'
                  : 'REVIEW'}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="text-text-muted">{item.message}</Text>
      {isPricingReview ? (
        <View className="mt-2">
          {item.pricingDistanceMiles != null ? (
            <Text className="text-text-dim text-[10px]">
              Distance: {item.pricingDistanceMiles.toFixed(1)} mi from base
            </Text>
          ) : null}
          {item.pricingReasons && item.pricingReasons.length > 1
            ? item.pricingReasons.slice(1).map(
                (r, i): React.JSX.Element => (
                  <Text key={`${i}-${r.slice(0, 24)}`} className="text-text-dim text-[10px]">
                    • {r}
                  </Text>
                ),
              )
            : null}
          {item.pricingRecommendedAction ? (
            <Text className="text-gold text-[11px] mt-1">
              Recommended: {item.pricingRecommendedAction.replace(/_/g, ' ').toLowerCase()}
              {item.pricingRecommendedPaymentMode
                ? ` · ${item.pricingRecommendedPaymentMode.toLowerCase()}`
                : ''}
            </Text>
          ) : null}
        </View>
      ) : null}
      {item.source ? (
        <Text className="text-text-dim text-[10px] mt-1">Source: {item.source}</Text>
      ) : null}
      {isEmergency && item.vehicleRegistration ? (
        <Text className="text-text-dim text-[10px] mt-1">
          Vehicle: {item.vehicleRegistration}
        </Text>
      ) : null}
      {(isEmergency || isCallClick || isCheckoutKind) && item.recommendedAction ? (
        <Text className="text-text-dim text-[10px] mt-1">
          Recommended: {item.recommendedAction.replace(/_/g, ' ').toLowerCase()}
        </Text>
      ) : null}
      {isCheckoutKind && item.vehicleRegistration ? (
        <Text className="text-text-dim text-[10px] mt-1">
          Vehicle: {item.vehicleRegistration}
        </Text>
      ) : null}
      {isCheckoutKind && item.phone ? (
        <Text className="text-gold text-[11px] mt-1">
          Phone: {formatUkPhoneForDisplay(item.phone)}
        </Text>
      ) : null}
      <Text className="text-text-dim text-[10px] mt-1">{timeAgo(item.createdAt)}</Text>
      {isCallClick ? (
        <View className="mt-1">
          {item.sourceComponent ? (
            <Text className="text-text-dim text-[10px]">From: {item.sourceComponent}</Text>
          ) : null}
          {item.sourcePage ? (
            <Text className="text-text-dim text-[10px]">Page: {item.sourcePage}</Text>
          ) : null}
          <Text className="text-text-dim text-[10px]">
            At: {new Date(item.createdAt).toLocaleTimeString()}
          </Text>
          {item.phone ? (
            <Text className="text-gold text-[11px] mt-1">Phone: {item.phone}</Text>
          ) : null}
        </View>
      ) : null}
      <View className="flex-row gap-2 mt-3 flex-wrap">
        {isEmergency && item.phone ? (
          <GoldButton
            label={`Call ${formatUkPhoneForDisplay(item.phone)}`}
            variant="primary"
            onPress={() => {
              void Linking.openURL(`tel:${item.phone}`);
            }}
          />
        ) : null}
        {isCheckoutKind && item.phone ? (
          <GoldButton
            label={`Call ${formatUkPhoneForDisplay(item.phone)}`}
            variant={isAbandoned ? 'primary' : 'secondary'}
            onPress={() => {
              void Linking.openURL(`tel:${item.phone}`);
            }}
          />
        ) : null}
        {isCheckoutKind && item.bookingId && item.phone ? (
          <GoldButton
            label="Send recovery SMS"
            variant="secondary"
            onPress={() => {
              const bookingId = item.bookingId;
              if (!bookingId) return;
              Alert.alert(
                'Send recovery SMS?',
                `A reminder with the payment link will be sent to ${formatUkPhoneForDisplay(item.phone ?? '')}.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Send',
                    onPress: () => {
                      void sendRecoverySms(bookingId)
                        .then((res) => {
                          if (res.ok) {
                            toast.success(
                              `Recovery SMS sent to ${formatUkPhoneForDisplay(res.sentTo ?? '')}`,
                            );
                            onHandled();
                          } else {
                            toast.error(res.error ?? 'Could not send SMS');
                          }
                        })
                        .catch((err) => {
                          const msg = err instanceof ApiError ? err.message : 'Network error';
                          toast.error(msg);
                        });
                    },
                  },
                ],
              );
            }}
          />
        ) : null}
        {isAbandoned && item.bookingId ? (
          <GoldButton
            label="Mark as cancelled"
            variant="secondary"
            onPress={() => {
              const bookingId = item.bookingId;
              if (!bookingId) return;
              Alert.alert(
                'Cancel this booking?',
                'Use this only if no payment was received. The booking will be cancelled and stock released.',
                [
                  { text: 'Keep', style: 'cancel' },
                  {
                    text: 'Cancel booking',
                    style: 'destructive',
                    onPress: () => {
                      void cancelPendingBooking(bookingId)
                        .then((res) => {
                          if (res.ok) {
                            toast.success(
                              `Booking ${res.trackingId ?? ''} cancelled`,
                            );
                            onHandled();
                          } else {
                            toast.error(res.error ?? 'Could not cancel');
                          }
                        })
                        .catch((err) => {
                          const msg = err instanceof ApiError ? err.message : 'Network error';
                          toast.error(msg);
                        });
                    },
                  },
                ],
              );
            }}
          />
        ) : null}
        {isCallClick ? (
          <>
            <GoldButton
              label="Open Quick Booking"
              variant="primary"
              onPress={openCallClickQuickBooking}
            />
            {item.phone ? (
              <GoldButton
                label={`Call ${item.phone}`}
                variant="secondary"
                onPress={callCustomerFromCallClick}
              />
            ) : null}
            <GoldButton label="Mark handled" variant="secondary" onPress={dismissCallClick} />
          </>
        ) : null}
        {item.bookingId && !isCallClick ? (
          <GoldButton
            label="Open booking"
            variant="primary"
            onPress={() => {
              router.push(`/bookings/${item.bookingId}` as never);
            }}
          />
        ) : null}
        {item.callbackRequestId ? (
          <GoldButton
            label="Open callbacks"
            variant="secondary"
            onPress={() => router.push('/callbacks' as never)}
          />
        ) : null}
        {item.stockId ? (
          <GoldButton
            label="Open stock"
            variant="secondary"
            onPress={() => router.push('/stock' as never)}
          />
        ) : null}
      </View>
    </GoldCard>
  );
}

export default function ActionQueueScreen(): React.JSX.Element {
  const [data, setData] = useState<ActionQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getActionQueue();
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load action queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const subtitle = data
    ? `${data.counts.danger} danger · ${data.counts.warning} warning · ${data.counts.info} info`
    : '';

  return (
    <AppShell>
      <OfflineBanner />
      <ScreenHeader title="Action queue" subtitle={subtitle} />
      {loading ? (
        <SkeletonCardList count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data || data.items.length === 0 ? (
        <>
          <PricingReviewSection />
          <EmptyState
            message="No urgent actions right now."
            action={{ label: 'Refresh', onPress: load, variant: 'secondary' }}
          />
        </>
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(i) => i.id}
          ListHeaderComponent={<PricingReviewSection />}
          renderItem={({ item, index }) => (
            <AnimatedCard delay={Math.min(index, 5) * 30} disabled={index > 8}>
              <ActionRow item={item} onHandled={load} />
            </AnimatedCard>
          )}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor="#D4AF37"
            />
          }
        />
      )}
    </AppShell>
  );
}
