import React from 'react';
import { Text, View } from 'react-native';
import { GoldCard } from '@/components/ui/GoldCard';
import type { BookingDetailExtended } from '@/types/bookings';

/**
 * Buy Tyres operational panel.
 *
 * Shown only when the booking originates from the public Buy Tyres flow
 * (`booking.source === 'tyre_shop'`). Surfaces the scheduled-fitting fields
 * that the admin needs to fulfil the order: fitting method, slot, quantity,
 * fees, payment mode, stock decrement audit and special-order ETA.
 *
 * No new business actions are added here — existing Quick actions / payment
 * link buttons on the detail screen remain the source of truth.
 */
export function BuyTyresDetailsPanel({
  detail,
}: {
  detail: BookingDetailExtended;
}): React.JSX.Element | null {
  if (detail.booking.source !== 'tyre_shop') return null;

  const b = detail.booking;
  const t = detail.tyre;

  const scheduledLabel = b.slotLabel
    ? b.slotLabel
    : b.scheduledAt
      ? new Date(b.scheduledAt).toLocaleString()
      : null;

  return (
    <GoldCard className="mb-3" tone="info" icon="🛒" title="Buy Tyres order">
      <View className="self-start bg-canvas border border-gold rounded-full px-2 py-0.5 mb-3">
        <Text className="text-gold text-[10px] font-semibold uppercase tracking-wide">
          Public Buy Tyres flow
        </Text>
      </View>

      {t ? (
        <View className="mb-2">
          <Text className="text-text font-semibold">
            {t.brand} {t.model}
          </Text>
          <Text className="text-text-muted text-xs">
            {t.sizeLabel}
            {b.quantity && b.quantity > 1 ? ` · Quantity ${b.quantity}` : ''}
          </Text>
          {t.basePriceGbp ? (
            <Text className="text-text-dim text-xs mt-0.5">
              Catalogue price £{t.basePriceGbp} per tyre
            </Text>
          ) : null}
        </View>
      ) : null}

      <Row
        label="Fitting method"
        value={
          b.fittingMethod === 'HOME'
            ? '🏠 Home fitting (mobile)'
            : b.fittingMethod === 'GARAGE'
              ? '🔧 Garage fitting'
              : '—'
        }
      />
      {scheduledLabel ? <Row label="Scheduled" value={scheduledLabel} /> : null}
      {b.quantity != null ? <Row label="Quantity" value={String(b.quantity)} /> : null}

      {b.isBackorder ? (
        <View className="mt-2 p-2 rounded-md border border-amber-500 bg-canvas">
          <Text className="text-amber-400 text-xs font-semibold">
            ⏳ Special order
          </Text>
          <Text className="text-text-muted text-xs mt-0.5">
            {b.backorderEtaDays
              ? `Fitted within ${b.backorderEtaDays} working days.`
              : 'Fitted within 3 working days.'}
          </Text>
        </View>
      ) : null}

      <View className="mt-3 border-t border-border pt-2">
        {b.fittingFeeGbp ? (
          <Row label="Fitting fee" value={`£${b.fittingFeeGbp}`} />
        ) : null}
        {b.distanceFeeGbp ? (
          <Row label="Distance fee" value={`£${b.distanceFeeGbp}`} />
        ) : null}
        {b.checkoutPaymentMode ? (
          <Row
            label="Payment mode"
            value={b.checkoutPaymentMode === 'DEPOSIT' ? 'Deposit' : 'Full payment'}
          />
        ) : null}
      </View>

      <View className="mt-3 border-t border-border pt-2">
        <Row
          label="Stock decremented"
          value={
            b.stockDecrementedAt
              ? `Yes · ${new Date(b.stockDecrementedAt).toLocaleString()}`
              : 'Not yet'
          }
        />
        {t?.stock ? (
          <Row
            label="Stock now"
            value={`${t.stock.quantityAvailable} available · ${t.stock.reservedQuantity} reserved`}
          />
        ) : null}
      </View>
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
