import React from 'react';
import { Share } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { useToast } from '@/components/ui/Toast';
import type { BookingDetailExtended } from '@/types/bookings';

/**
 * Admin Efficiency Pack F4 — Copy booking summary.
 *
 * Generates a clean, plain-text summary of the booking for the admin to
 * paste into WhatsApp, an email, or a notes app. Uses the native share
 * sheet because expo-clipboard is not installed in this app.
 */
function buildSummary(detail: BookingDetailExtended): string {
  const b = detail.booking;
  const lines: string[] = [];
  lines.push(`Booking ${b.trackingId}`);
  lines.push(`Status: ${b.status} · Payment: ${b.paymentStatus}`);
  if (b.jobType) lines.push(`Job: ${b.jobType}`);
  if (b.tyreProblemType) lines.push(`Issue: ${b.tyreProblemType.replace(/_/g, ' ').toLowerCase()}`);
  lines.push('');
  lines.push('Customer');
  lines.push(`  Name: ${detail.customer.name ?? '—'}`);
  lines.push(`  Phone: ${detail.customer.phone ?? '—'}`);
  if (detail.customer.email) lines.push(`  Email: ${detail.customer.email}`);
  if (detail.location) {
    lines.push('');
    lines.push('Location');
    const addr = [detail.location.addressLine1, detail.location.city, detail.location.postcode]
      .filter(Boolean)
      .join(', ');
    if (addr) lines.push(`  ${addr}`);
    if (detail.location.latitude != null && detail.location.longitude != null) {
      lines.push(`  GPS: ${detail.location.latitude}, ${detail.location.longitude}`);
    }
  }
  if (detail.tyre) {
    lines.push('');
    lines.push('Tyre');
    lines.push(`  ${detail.tyre.brand} ${detail.tyre.model} ${detail.tyre.sizeLabel}`);
    if (detail.tyre.sku) lines.push(`  SKU: ${detail.tyre.sku}`);
  }
  if (detail.paymentSummary) {
    lines.push('');
    lines.push('Payment');
    if (detail.paymentSummary.totalPriceGbp) {
      lines.push(`  Total: £${detail.paymentSummary.totalPriceGbp}`);
    }
    if (detail.paymentSummary.amountPaidGbp) {
      lines.push(`  Paid: £${detail.paymentSummary.amountPaidGbp}`);
    }
    if (detail.paymentSummary.balanceDueGbp) {
      lines.push(`  Balance due: £${detail.paymentSummary.balanceDueGbp}`);
    }
  }
  lines.push('');
  lines.push(`Locking nut: ${b.lockingWheelNutStatus}`);
  return lines.join('\n');
}

export function CopySummaryButton({
  detail,
}: {
  detail: BookingDetailExtended;
}): React.JSX.Element {
  const toast = useToast();
  const onPress = async (): Promise<void> => {
    const text = buildSummary(detail);
    try {
      await Share.share({ message: text });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not share');
    }
  };
  return <GoldButton label="Copy summary" variant="secondary" onPress={() => void onPress()} />;
}
