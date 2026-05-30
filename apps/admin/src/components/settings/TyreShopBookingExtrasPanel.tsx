import React, { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import {
  getTyreShopBookingExtras,
  updateTyreShopBookingExtras,
} from '@/lib/api/tyre-shop-booking';
import { ApiError } from '@/lib/api/client';
import type { TyreShopBookingExtras } from '@/types/tyre-shop-booking';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

interface DraftState {
  data: TyreShopBookingExtras;
  slotTimesText: string;
  bookingWindowDaysText: string;
  quoteExpiryMinutesText: string;
  minimumDepositGbpText: string;
  peakStartText: string;
  peakEndText: string;
  nightStartText: string;
  nightEndText: string;
}

function toDraft(data: TyreShopBookingExtras): DraftState {
  return {
    data,
    slotTimesText: data.slotTimes.join(','),
    bookingWindowDaysText: String(data.bookingWindowDays),
    quoteExpiryMinutesText: String(data.quoteExpiryMinutes),
    minimumDepositGbpText: data.minimumDepositGbp.toFixed(2),
    peakStartText: String(data.peakMorningStartHour),
    peakEndText: String(data.peakMorningEndHour),
    nightStartText: String(data.nightStartHour),
    nightEndText: String(data.nightEndHour),
  };
}

export function TyreShopBookingExtrasPanel(): React.JSX.Element {
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTyreShopBookingExtras()
      .then((r) => setDraft(toDraft(r.settings)))
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : 'Could not load booking settings'),
      );
  }, []);

  const save = async (): Promise<void> => {
    if (!draft) return;

    const slotTimes = draft.slotTimesText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (slotTimes.length === 0 || !slotTimes.every((s) => HHMM.test(s))) {
      Alert.alert(
        'Invalid slot times',
        'Use comma-separated HH:MM values, e.g. 09:00,11:00,13:00,15:00',
      );
      return;
    }
    const bookingWindowDays = Number(draft.bookingWindowDaysText);
    if (!Number.isInteger(bookingWindowDays) || bookingWindowDays < 1 || bookingWindowDays > 60) {
      Alert.alert('Invalid booking window', 'Whole number between 1 and 60.');
      return;
    }
    const quoteExpiryMinutes = Number(draft.quoteExpiryMinutesText);
    if (
      !Number.isInteger(quoteExpiryMinutes) ||
      quoteExpiryMinutes < 1 ||
      quoteExpiryMinutes > 24 * 60
    ) {
      Alert.alert('Invalid quote expiry', 'Whole minutes between 1 and 1440.');
      return;
    }
    const minimumDepositGbp = Number(draft.minimumDepositGbpText);
    if (!Number.isFinite(minimumDepositGbp) || minimumDepositGbp < 0 || minimumDepositGbp > 1000) {
      Alert.alert('Invalid minimum deposit', 'GBP amount between 0 and 1000.');
      return;
    }
    const hourFields: { key: string; raw: string; value: number }[] = [
      { key: 'Peak start', raw: draft.peakStartText, value: Number(draft.peakStartText) },
      { key: 'Peak end', raw: draft.peakEndText, value: Number(draft.peakEndText) },
      { key: 'Night start', raw: draft.nightStartText, value: Number(draft.nightStartText) },
      { key: 'Night end', raw: draft.nightEndText, value: Number(draft.nightEndText) },
    ];
    for (const h of hourFields) {
      if (!Number.isInteger(h.value) || h.value < 0 || h.value > 23) {
        Alert.alert(`Invalid ${h.key}`, 'Whole hour 0–23 (London time).');
        return;
      }
    }

    setSaving(true);
    try {
      const next = await updateTyreShopBookingExtras({
        slotTimes,
        bookingWindowDays,
        sundaysOpen: draft.data.sundaysOpen,
        quoteExpiryMinutes,
        minimumDepositGbp: Math.round(minimumDepositGbp * 100) / 100,
        peakMorningStartHour: hourFields[0].value,
        peakMorningEndHour: hourFields[1].value,
        nightStartHour: hourFields[2].value,
        nightEndHour: hourFields[3].value,
      });
      setDraft(toDraft(next.settings));
      Alert.alert('Saved', 'Booking window and pricing extras updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof ApiError ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GoldCard className="mb-3">
      <Text className="text-text font-semibold mb-1">
        Buy-Tyres booking window & pricing extras
      </Text>
      <Text className="text-text-dim text-xs mb-3">
        Controls the Buy-Tyres slot grid, deposit floor and quote validity. Changes go live
        immediately for new customer quotes.
      </Text>
      {error ? <Text className="text-danger text-xs mb-2">{error}</Text> : null}
      {!draft ? (
        <Text className="text-text-muted">Loading…</Text>
      ) : (
        <>
          <GoldInput
            label="Slot times (HH:MM, comma-separated)"
            placeholder="09:00,11:00,13:00,15:00"
            value={draft.slotTimesText}
            onChangeText={(v) => setDraft({ ...draft, slotTimesText: v })}
            autoCapitalize="none"
          />
          <GoldInput
            label="Booking window (days ahead)"
            placeholder="14"
            value={draft.bookingWindowDaysText}
            onChangeText={(v) => setDraft({ ...draft, bookingWindowDaysText: v })}
            keyboardType="number-pad"
          />
          <View className="flex-row items-center justify-between my-3">
            <View className="flex-1 pr-3">
              <Text className="text-text">Open on Sundays</Text>
              <Text className="text-text-dim text-xs">
                When off, Sunday is skipped in the public booking grid.
              </Text>
            </View>
            <Switch
              value={draft.data.sundaysOpen}
              onValueChange={(v) =>
                setDraft({ ...draft, data: { ...draft.data, sundaysOpen: v } })
              }
              trackColor={{ false: '#2A2A33', true: '#8F0010' }}
              thumbColor={draft.data.sundaysOpen ? '#E30613' : '#6B6B75'}
            />
          </View>
          <GoldInput
            label="Quote expiry (minutes)"
            placeholder="30"
            value={draft.quoteExpiryMinutesText}
            onChangeText={(v) => setDraft({ ...draft, quoteExpiryMinutesText: v })}
            keyboardType="number-pad"
          />
          <GoldInput
            label="Minimum deposit (£)"
            placeholder="10.00"
            value={draft.minimumDepositGbpText}
            onChangeText={(v) => setDraft({ ...draft, minimumDepositGbpText: v })}
            keyboardType="decimal-pad"
          />
          <View className="mt-3 mb-1">
            <Text className="text-text font-semibold">Surge hour bands (London time)</Text>
            <Text className="text-text-dim text-xs">
              Whole hours 0–23. End is exclusive; night wraps past midnight (e.g. 22 → 6).
            </Text>
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <GoldInput
                label="Peak start"
                placeholder="7"
                value={draft.peakStartText}
                onChangeText={(v) => setDraft({ ...draft, peakStartText: v })}
                keyboardType="number-pad"
              />
            </View>
            <View className="flex-1">
              <GoldInput
                label="Peak end"
                placeholder="9"
                value={draft.peakEndText}
                onChangeText={(v) => setDraft({ ...draft, peakEndText: v })}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <GoldInput
                label="Night start"
                placeholder="22"
                value={draft.nightStartText}
                onChangeText={(v) => setDraft({ ...draft, nightStartText: v })}
                keyboardType="number-pad"
              />
            </View>
            <View className="flex-1">
              <GoldInput
                label="Night end"
                placeholder="6"
                value={draft.nightEndText}
                onChangeText={(v) => setDraft({ ...draft, nightEndText: v })}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View className="items-end mt-3">
            <GoldButton
              label="Save booking settings"
              onPress={() => void save()}
              loading={saving}
            />
          </View>
        </>
      )}
    </GoldCard>
  );
}
