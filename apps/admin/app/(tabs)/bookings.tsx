import React, { useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { AppShell, ScreenHeader } from '@/components/layout/AppShell';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PressableScale } from '@/components/ui/PressableScale';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { BookingCardSkeletonList } from '@/components/ui/Skeleton';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
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
import { useRefresh } from '@/hooks/useRefresh';
import { qk } from '@/lib/query/keys';
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
    <PressableScale onPress={onOpen}>
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
        {item.source === 'tyre_shop' ? (
          <View className="self-start bg-canvas border border-gold rounded-full px-2 py-0.5 mb-2">
            <Text className="text-gold text-[10px] font-semibold uppercase tracking-wide">
              🛒 Buy Tyres order
            </Text>
          </View>
        ) : null}
        {item.tyreProblemType ? (
          <Text className="text-text-muted text-xs mb-1">
            Tyre problem: {tyreProblemLabel(item.tyreProblemType)}
          </Text>
        ) : null}
        {item.tyre ? (
          <Text className="text-text-muted text-sm">
            {item.tyre.brand} {item.tyre.model} {item.tyre.sizeLabel}
            {item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : ''}
          </Text>
        ) : null}
        {item.source === 'tyre_shop' ? (
          <View className="mt-1">
            {item.fittingMethod ? (
              <Text className="text-text-muted text-xs">
                {item.fittingMethod === 'HOME' ? '🏠 Home fitting' : '🔧 Garage fitting'}
                {item.slotLabel ? ` · ${item.slotLabel}` : ''}
                {!item.slotLabel && item.scheduledAt
                  ? ` · ${new Date(item.scheduledAt).toLocaleString()}`
                  : ''}
              </Text>
            ) : null}
            {item.isBackorder ? (
              <Text className="text-amber-400 text-xs font-semibold mt-0.5">
                ⏳ Special order
                {item.backorderEtaDays
                  ? ` · fitted within ${item.backorderEtaDays} working days`
                  : ' · fitted within 3 working days'}
              </Text>
            ) : null}
          </View>
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
    </PressableScale>
  );
}

export default function BookingsScreen(): React.JSX.Element {
  const { online } = useNetworkStatus();
  const [filter, setFilter] = useState<BookingFilterState>(INITIAL_FILTER);
  const toast = useToast();
  const qc = useQueryClient();

  // Base query (without `page`) feeds both the infinite key and the loader.
  const baseQuery = useMemo(() => filterStateToQuery(filter, 1, PAGE_SIZE), [filter]);
  const infiniteKey = qk.bookingsList({ ...baseQuery, page: undefined });

  const listQuery = useInfiniteQuery({
    queryKey: infiniteKey,
    queryFn: ({ pageParam = 1 }) => listBookings({ ...baseQuery, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => {
      const total = last.totalPages ?? 1;
      const next = pages.length + 1;
      return next <= total ? next : undefined;
    },
  });

  const items: BookingListItem[] = useMemo(
    () => (listQuery.data?.pages ?? []).flatMap((p) => p.data ?? p.items ?? []),
    [listQuery.data],
  );
  const total = listQuery.data?.pages[0]?.total ?? 0;
  const loading = listQuery.isLoading;
  const error =
    listQuery.isError && listQuery.error instanceof Error ? listQuery.error.message : null;

  const { refreshControl } = useRefresh(() => listQuery.refetch());

  type PageShape = Awaited<ReturnType<typeof listBookings>>;
  type InfShape = InfiniteData<PageShape>;

  const advanceMutation = useMutation({
    mutationFn: ({ bookingId, toStatus }: { bookingId: string; toStatus: BookingStatus }) =>
      updateBookingStatus(bookingId, toStatus),
    onMutate: async ({ bookingId, toStatus }) => {
      await qc.cancelQueries({ queryKey: qk.bookings() });
      const previous = qc.getQueryData<InfShape>(infiniteKey);
      if (previous) {
        const nextPages: PageShape[] = previous.pages.map((pg) => {
          const replace = (arr: BookingListItem[]) =>
            arr.map((b) => (b.bookingId === bookingId ? { ...b, status: toStatus } : b));
          if (pg.data) return { ...pg, data: replace(pg.data) };
          if (pg.items) return { ...pg, items: replace(pg.items) };
          return pg;
        });
        qc.setQueryData<InfShape>(infiniteKey, { ...previous, pages: nextPages });
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(infiniteKey, ctx.previous);
      toast.error(err instanceof ApiError ? err.message : 'Could not update booking');
    },
    onSuccess: (_res, { toStatus }) => {
      toast.success(`Status updated to ${bookingStatusLabel(toStatus)}`);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.bookings() });
    },
  });

  const advance = (bookingId: string, toStatus: BookingStatus): void => {
    advanceMutation.mutate({ bookingId, toStatus });
  };

  return (
    <AppShell>
      <OfflineBanner />
      <ScreenHeader
        title="Bookings"
        {...(total ? { subtitle: `${items.length} of ${total} loaded` } : {})}
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
        }}
      />
      {loading ? (
        <BookingCardSkeletonList count={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void listQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          illustration="bookings"
          title="No bookings yet"
          message="No bookings match these filters. Try widening the date range or clearing the search."
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(b) => b.bookingId}
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index} disabled={index > 8}>
              <BookingRow
                item={item}
                online={online}
                onAdvance={(next) => advance(item.bookingId, next)}
                onOpen={() => router.push(`/bookings/${item.bookingId}` as never)}
              />
            </AnimatedListItem>
          )}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          refreshControl={refreshControl}
          onEndReached={() => {
            if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
              void listQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            listQuery.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <Text className="text-text-dim text-xs">Loading more…</Text>
              </View>
            ) : !listQuery.hasNextPage && items.length > 0 ? (
              <View className="py-4 items-center">
                <Text className="text-text-dim text-xs">No more results</Text>
              </View>
            ) : null
          }
        />
      )}
    </AppShell>
  );
}
