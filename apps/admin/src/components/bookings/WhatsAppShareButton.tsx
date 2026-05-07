import React from 'react';
import { Linking } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { useToast } from '@/components/ui/Toast';
import { bookingStatusLabel, paymentStatusLabel } from '@/lib/format/labels';
import type { BookingDetailExtended } from '@/types/bookings';

/**
 * One-tap "share booking via WhatsApp" — opens WhatsApp with a pre-filled
 * summary message ready for the operator to forward to a technician or to
 * the customer themselves.
 *
 * Falls back to the WhatsApp web link if the native app is not installed.
 */
function buildSummary(detail: BookingDetailExtended): string {
  const b = detail.booking;
  const lines: string[] = [];
  lines.push(`*Booking ${b.trackingId}*`);
  lines.push(`Status: ${bookingStatusLabel(b.status)} · ${paymentStatusLabel(b.paymentStatus)}`);
  if (b.jobType) {
    lines.push(`Job: ${b.jobType === 'ASSESSMENT' ? 'Assessment' : 'Replacement'}`);
  }
  lines.push('');
  if (detail.customer.name) lines.push(`Customer: ${detail.customer.name}`);
  if (detail.customer.phone) lines.push(`Phone: ${detail.customer.phone}`);
  if (detail.location) {
    const addr = [detail.location.addressLine1, detail.location.city, detail.location.postcode]
      .filter(Boolean)
      .join(', ');
    if (addr) lines.push(`Address: ${addr}`);
    if (detail.location.latitude != null && detail.location.longitude != null) {
      lines.push(
        `Maps: https://maps.google.com/?q=${detail.location.latitude},${detail.location.longitude}`,
      );
    }
  }
  if (detail.tyre) {
    lines.push('');
    lines.push(`Tyre: ${detail.tyre.brand} ${detail.tyre.model} ${detail.tyre.sizeLabel}`);
  }
  if (b.lockingWheelNutStatus === 'NO_KEY') {
    lines.push('');
    lines.push('⚠️ MISSING locking wheel nut key.');
  }
  return lines.join('\n');
}

export function WhatsAppShareButton({
  detail,
}: {
  detail: BookingDetailExtended;
}): React.JSX.Element {
  const toast = useToast();
  const onPress = async (): Promise<void> => {
    const text = buildSummary(detail);
    const encoded = encodeURIComponent(text);
    // Native app scheme first, then web fallback.
    const native = `whatsapp://send?text=${encoded}`;
    const web = `https://wa.me/?text=${encoded}`;
    try {
      const canOpen = await Linking.canOpenURL(native);
      await Linking.openURL(canOpen ? native : web);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open WhatsApp');
    }
  };
  return (
    <GoldButton
      label="📤 WhatsApp"
      variant="secondary"
      onPress={() => void onPress()}
    />
  );
}
