import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { SkeletonCardList } from '@/components/ui/Skeleton';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import {
  BookingFilters,
  INITIAL_FILTER,
  filterStateToQuery,
  type BookingFilterState,
} from '@/components/bookings/BookingFilters';
import { listBookings, updateBookingStatus } from '@/lib/api/bookings';
import { convertBookingToReplacement } from '@/lib/api/adjustments';
import { sendBookingPaymentLinkWithConfirm } from '@/lib/send-payment-link';
import { ApiError } from '@/lib/api/client';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { runIfOnline } from '@/lib/offline-guard';
import { useToast } from '@/components/ui/Toast';
import { bookingStatusLabel, formatUkPhoneForDisplay } from '@/lib/format/labels';
import type { BookingListItem, BookingStatus } from '@/types/bookings';

const PAGE_SIZE = 25;

const NEXT_STATUSES: Record<BookingStatus, BookingStatus[]> = {
  pending_payment: ['cancelled'],
  confirmed: ['dispatching', 'cancelled'],
  dispatching: ['dispatched', 'cancelled'],
  dispatched: ['on_site', 'cancelled'],
  on_site: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  refunded: [],
  failed: [],
};

function tyreProblemLabel(p: NonNullable<BookingListItem['tyreProblemType']>): string {
  switch (p) {
    case 'PUNCTURE_OR_FLAT':
      return 'Puncture or flat';
    case 'DAMAGED_OR_BLOWN_OUT':
      return 'Damaged sidewall or blowout';
    case 'SLOW_PRESSURE_LOSS':
      return 'Slow pressure loss';
    case 'NEEDS_REPLACEMENT':
      return 'Replacement requested';
    case 'NOT_SURE':
    default:
      return 'Not sure';
  }
}

function BookingRow({
  item,
  online,
  onAdvance,
  onOpen,
}: {
  item: BookingListItem;
  online: boolean;
  onAdvance: (next: BookingStatus) => void;
  onOpen: () => void;
}): React.JSX.Element {
  const next = NEXT_STATUSES[item.status];
  const isAssessment = item.jobType === 'ASSESSMENT';
  const [convertOpen, setConvertOpen] = useState(false);
  const [tyreIdInput, setTyreIdInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isConvertEligible =
    isAssessment &&
    (item.status === 'confirmed' ||
      item.status === 'dispatching' ||
      item.status === 'dispatched' ||
      item.status === 'on_site');

  const onSendPaymentLink = runIfOnline(online, async (method: 'sms' | 'email' | 'both') => {
    const r = await sendBookingPaymentLinkWithConfirm(item.bookingId, {
      method,
      paymentPurpose: 'booking',
    });
    if (r && !r.alreadySentRecently) {
      Alert.alert(
        'Payment link sent',
        `URL: ${r.paymentUrl}\nSMS: ${r.sentSms ? 'sent' : r.smsSkippedReason ?? 'skipped'}\nEmail: ${r.sentEmail ? 'sent' : r.emailSkippedReason ?? 'skipped'}`,
      );
    }
  });

  const onConvertSubmit = () => {
    const tyreId = tyreIdInput.trim();
    if (!tyreId) {
      Alert.alert('Tyre ID required', 'Paste the tyre catalogue UUID to convert.');
      return;
    }
    setSubmitting(true);
    void (async () => {
      try {
        const r = await convertBookingToReplacement(item.bookingId, { tyreId });
        Alert.alert(
          'Replacement quote created',
          `Additional due: £${r.adjustment.additionalAmountGbp}\nLink: ${r.adjustment.paymentLinkUrl}`,
        );
        setConvertOpen(false);
        setTyreIdInput('');
      } catch (e) {
        Alert.alert('Convert failed', e instanceof ApiError ? e.message : 'Unknown error');
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <Pressable onPress={onOpen}>
      <GoldCard className="mb-3">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1">
            <Text className="text-text font-semibold">{item.customer.name ?? 'Unknown'}</Text>
            <Text className="text-text-muted text-xs">{formatUkPhoneForDisplay(item.customer.phone) || '—'}</Text>
            <Text className="text-text-dim text-xs mt-1">{item.trackingId}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
        <Text
          className={
            isAssessment
              ? 'text-amber-400 text-xs font-semibold mb-2'
              : 'text-gold text-xs font-semibold mb-2'
          }
        >
          {isAssessment ? '🛠 Emergency assessment' : '🛞 Tyre replacement'}
        </Text>
        {item.tyreProblemType ? (
          <Text className="text-text-muted text-xs mb-1">
            Tyre problem: {tyreProblemLabel(item.tyreProblemType)}
          </Text>
        ) : null}
        {item.tyre ? (
          <Text className="text-text-muted text-sm">
            {item.tyre.brand} {item.tyre.model} {item.tyre.sizeLabel}
          </Text>
        ) : null}
        {item.location?.addressLine1 ? (
          <Text className="text-text-muted text-sm mt-1">{item.location.addressLine1}</Text>
        ) : null}
        {item.totalPriceGbp ? (
          <Text className="text-gold mt-1 font-semibold">
            £{item.totalPriceGbp}
            {isAssessment ? ' assessment fee' : ''}
          </Text>
        ) : null}
        {item.balanceDueGbp && Number(item.balanceDueGbp) > 0 ? (
          <Text className="text-warning mt-1 text-xs font-semibold">
            Balance due £{item.balanceDueGbp}
          </Text>
        ) : null}
        {item.lockingWheelNutStatus === 'NO_KEY' ? (
          <Text className="text-danger mt-2 font-semibold text-xs">
            ⚠️ MISSING KEY – Call customer before dispatch
          </Text>
        ) : null}
        {next.length > 0 ? (
          <View className="flex-row flex-wrap gap-2 mt-3">
            {next.map((n) => (
              <Pressable
                key={n}
                onPress={() => {
                  Alert.alert(
                    `Move to ${bookingStatusLabel(n)}?`,
                    `Booking ${item.trackingId} will be updated.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Confirm', onPress: () => onAdvance(n) },
                    ],
                  );
                }}
                disabled={!online}
                className={`bg-surfaceMuted px-4 py-3 rounded-lg border border-border min-h-[44px] justify-center ${!online ? 'opacity-40' : ''}`}
              >
                <Text className="text-gold text-sm font-semibold">
                  → {bookingStatusLabel(n)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-2 mt-3">
          <Pressable
            onPress={() => void onSendPaymentLink('sms')}
            disabled={!online}
            className={`bg-surfaceMuted px-3 py-2 rounded-lg border border-border ${!online ? 'opacity-40' : ''}`}
          >
            <Text className="text-gold text-xs font-semibold">📱 Send SMS link</Text>
          </Pressable>
          <Pressable
            onPress={() => void onSendPaymentLink('email')}
            disabled={!online}
            className={`bg-surfaceMuted px-3 py-2 rounded-lg border border-border ${!online ? 'opacity-40' : ''}`}
          >
            <Text className="text-gold text-xs font-semibold">✉️ Send email link</Text>
          </Pressable>
          {isConvertEligible ? (
            <Pressable
              onPress={() => setConvertOpen((v) => !v)}
              className="bg-surfaceMuted px-3 py-2 rounded-lg border border-gold"
            >
              <Text className="text-gold text-xs font-semibold">
                {convertOpen ? '✕ Cancel' : '🛞 Convert to replacement'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {convertOpen ? (
          <View className="mt-3 p-3 rounded-lg border border-gold bg-surfaceMuted">
            <Text className="text-text-muted text-xs mb-2">
              Paste the tyre catalogue UUID to fit. The customer will receive a payment link for the
              difference.
            </Text>
            <TextInput
              value={tyreIdInput}
              onChangeText={setTyreIdInput}
              placeholder="Tyre UUID"
              placeholderTextColor="#6B6B75"
              autoCapitalize="none"
              autoCorrect={false}
              className="bg-canvas text-text px-3 py-2 rounded-md border border-border mb-2"
            />
            <GoldButton
              label={submitting ? 'Creating…' : 'Create replacement quote'}
              variant="primary"
              loading={submitting}
              disabled={submitting || !online}
              onPress={onConvertSubmit}
            />
          </View>
        ) : null}
      </GoldCard>
    </Pressable>
  );
}

export default function BookingsScreen(): React.JSX.Element {
  const { online } = useNetworkStatus();
  const [filter, setFilter] = useState<BookingFilterState>(INITIAL_FILTER);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<BookingListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => filterStateToQuery(filter, page, PAGE_SIZE), [filter, page]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listBookings(query);
      setItems(res.data ?? res.items ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const toast = useToast();
  const advance = useCallback(
    async (bookingId: string, toStatus: BookingStatus) => {
      try {
        await updateBookingStatus(bookingId, toStatus);
        toast.success(`Status updated to ${bookingStatusLabel(toStatus)}`);
        await load();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Could not update booking';
        toast.error(msg);
        setError(msg);
      }
    },
    [load, toast],
  );

  return (
    <AppShell>
      <OfflineBanner />
      <ScreenHeader
        title="Bookings"
        subtitle={`Page ${page} of ${totalPages} · ${total} total`}
        right={
          <GoldButton
            label="+ New"
            onPress={() => router.push('/quick-booking' as never)}
          />
        }
      />
      <BookingFilters
        state={filter}
        onChange={(next) => {
          setFilter(next);
          setPage(1);
        }}
      />
      {loading ? (
        <SkeletonCardList count={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />
      ) : items.length === 0 ? (
        <EmptyState message="No bookings match these filters. Try widening the date range or clearing the search." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.bookingId}
          renderItem={({ item }) => (
            <BookingRow
              item={item}
              online={online}
              onAdvance={(next) => void advance(item.bookingId, next)}
              onOpen={() => router.push(`/bookings/${item.bookingId}` as never)}
            />
          )}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
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
          ListFooterComponent={
            totalPages > 1 ? (
              <View className="flex-row justify-center items-center gap-3 mt-2">
                <GoldButton
                  label="◀ Prev"
                  variant="secondary"
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                />
                <Text className="text-text self-center">
                  {page} / {totalPages}
                </Text>
                <GoldButton
                  label="Next ▶"
                  variant="secondary"
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              </View>
            ) : null
          }
        />
      )}
    </AppShell>
  );
}
