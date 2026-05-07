import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { BookingListQuery } from '@/lib/api/bookings';

export interface BookingFilterState {
  q: string;
  jobType: 'all' | 'ASSESSMENT' | 'REPLACEMENT';
  bookingStatus: 'all' | 'pending_payment' | 'confirmed' | 'dispatched' | 'on_site' | 'completed' | 'cancelled';
  flag:
    | 'none'
    | 'paymentFailed'
    | 'balanceDue'
    | 'depositPaid'
    | 'missingLockingNutKey'
    | 'cancelled'
    | 'completed';
}

export const INITIAL_FILTER: BookingFilterState = {
  q: '',
  jobType: 'all',
  bookingStatus: 'all',
  flag: 'none',
};

export function filterStateToQuery(
  state: BookingFilterState,
  page: number,
  pageSize: number,
): BookingListQuery {
  const q: BookingListQuery = { page, pageSize };
  if (state.q.trim()) q.q = state.q.trim();
  if (state.jobType !== 'all') q.jobType = state.jobType;
  if (state.bookingStatus !== 'all') q.bookingStatus = state.bookingStatus;
  switch (state.flag) {
    case 'paymentFailed':
      q.paymentFailed = true;
      break;
    case 'balanceDue':
      q.balanceDue = true;
      break;
    case 'depositPaid':
      q.depositPaid = true;
      break;
    case 'missingLockingNutKey':
      q.missingLockingNutKey = true;
      break;
    case 'cancelled':
      q.cancelled = true;
      break;
    case 'completed':
      q.completed = true;
      break;
  }
  return q;
}

interface ChipProps<T extends string> {
  label: string;
  value: T;
  active: T;
  onSelect: (v: T) => void;
}

function Chip<T extends string>({ label, value, active, onSelect }: ChipProps<T>): React.JSX.Element {
  const isActive = value === active;
  return (
    <Pressable
      onPress={() => onSelect(value)}
      className={`px-3 py-1 rounded-full border mr-2 mb-2 ${isActive ? 'bg-gold border-gold' : 'border-border'}`}
    >
      <Text className={isActive ? 'text-canvas font-semibold text-xs' : 'text-text-muted text-xs'}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BookingFilters({
  state,
  onChange,
}: {
  state: BookingFilterState;
  onChange: (next: BookingFilterState) => void;
}): React.JSX.Element {
  return (
    <View className="px-3 pt-2">
      <TextInput
        value={state.q}
        onChangeText={(v) => onChange({ ...state, q: v })}
        placeholder="Search tracking ID, name, phone…"
        placeholderTextColor="#6B6B75"
        className="bg-canvas border border-border rounded-md px-3 py-2 text-text mb-2"
      />

      <Text className="text-text-dim text-[10px] uppercase tracking-wide mb-1">Job</Text>
      <View className="flex-row flex-wrap">
        <Chip label="All" value="all" active={state.jobType} onSelect={(v) => onChange({ ...state, jobType: v })} />
        <Chip label="Assessment" value="ASSESSMENT" active={state.jobType} onSelect={(v) => onChange({ ...state, jobType: v })} />
        <Chip label="Replacement" value="REPLACEMENT" active={state.jobType} onSelect={(v) => onChange({ ...state, jobType: v })} />
      </View>

      <Text className="text-text-dim text-[10px] uppercase tracking-wide mb-1 mt-1">Status</Text>
      <View className="flex-row flex-wrap">
        <Chip label="All" value="all" active={state.bookingStatus} onSelect={(v) => onChange({ ...state, bookingStatus: v })} />
        <Chip label="Pending pay" value="pending_payment" active={state.bookingStatus} onSelect={(v) => onChange({ ...state, bookingStatus: v })} />
        <Chip label="Confirmed" value="confirmed" active={state.bookingStatus} onSelect={(v) => onChange({ ...state, bookingStatus: v })} />
        <Chip label="Dispatched" value="dispatched" active={state.bookingStatus} onSelect={(v) => onChange({ ...state, bookingStatus: v })} />
        <Chip label="On site" value="on_site" active={state.bookingStatus} onSelect={(v) => onChange({ ...state, bookingStatus: v })} />
        <Chip label="Completed" value="completed" active={state.bookingStatus} onSelect={(v) => onChange({ ...state, bookingStatus: v })} />
        <Chip label="Cancelled" value="cancelled" active={state.bookingStatus} onSelect={(v) => onChange({ ...state, bookingStatus: v })} />
      </View>

      <Text className="text-text-dim text-[10px] uppercase tracking-wide mb-1 mt-1">Flag</Text>
      <View className="flex-row flex-wrap">
        <Chip label="None" value="none" active={state.flag} onSelect={(v) => onChange({ ...state, flag: v })} />
        <Chip label="Payment failed" value="paymentFailed" active={state.flag} onSelect={(v) => onChange({ ...state, flag: v })} />
        <Chip label="Balance due" value="balanceDue" active={state.flag} onSelect={(v) => onChange({ ...state, flag: v })} />
        <Chip label="Deposit paid" value="depositPaid" active={state.flag} onSelect={(v) => onChange({ ...state, flag: v })} />
        <Chip label="No nut key" value="missingLockingNutKey" active={state.flag} onSelect={(v) => onChange({ ...state, flag: v })} />
      </View>
    </View>
  );
}
