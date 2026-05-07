import 'server-only';

/**
 * Admin Efficiency Pack — Feature 4: Copy Booking Summary.
 *
 * Build a clean, multi-line, human-readable booking summary for clipboard
 * copy. Never includes secrets, Stripe IDs, or raw card data.
 */

export interface AdminBookingSummaryInput {
  trackingId: string;
  status: string;
  paymentStatus: string;
  jobType: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postcode?: string | null;
  hasGps: boolean;
  tyreLabel?: string | null;
  tyreSize?: string | null;
  totalPriceGbp?: string | null;
  amountPaidGbp?: string | null;
  balanceDueGbp?: string | null;
  lockingNutStatus?: string | null;
  customerNotes?: string | null;
  adminNotes?: string | null;
  trackingLink?: string | null;
}

export function buildAdminBookingSummary(input: AdminBookingSummaryInput): string {
  const lines: string[] = [];
  lines.push(`Booking ${input.trackingId}`);
  lines.push(`Status: ${input.status} (${input.paymentStatus})`);
  lines.push(`Job type: ${input.jobType}`);

  if (input.customerName || input.customerPhone) {
    lines.push('');
    lines.push('Customer:');
    if (input.customerName) lines.push(`  Name: ${input.customerName}`);
    if (input.customerPhone) lines.push(`  Phone: ${input.customerPhone}`);
    if (input.customerEmail) lines.push(`  Email: ${input.customerEmail}`);
  }

  const addrParts = [input.addressLine1, input.city, input.postcode].filter(Boolean);
  if (addrParts.length > 0 || input.hasGps) {
    lines.push('');
    lines.push('Location:');
    if (addrParts.length > 0) lines.push(`  ${addrParts.join(', ')}`);
    if (input.hasGps) lines.push('  GPS pin shared');
  }

  if (input.tyreLabel || input.tyreSize) {
    lines.push('');
    lines.push('Tyre:');
    if (input.tyreLabel) lines.push(`  ${input.tyreLabel}`);
    if (input.tyreSize) lines.push(`  Size ${input.tyreSize}`);
  }

  if (input.totalPriceGbp || input.amountPaidGbp || input.balanceDueGbp) {
    lines.push('');
    lines.push('Money:');
    if (input.totalPriceGbp) lines.push(`  Total: £${input.totalPriceGbp}`);
    if (input.amountPaidGbp) lines.push(`  Paid: £${input.amountPaidGbp}`);
    if (input.balanceDueGbp && Number(input.balanceDueGbp) > 0) {
      lines.push(`  Balance due: £${input.balanceDueGbp}`);
    }
  }

  if (input.lockingNutStatus) {
    lines.push('');
    lines.push(`Locking wheel nut: ${input.lockingNutStatus}`);
  }

  if (input.customerNotes) {
    lines.push('');
    lines.push('Customer notes:');
    lines.push(`  ${input.customerNotes.trim()}`);
  }
  if (input.adminNotes) {
    lines.push('');
    lines.push('Admin notes:');
    lines.push(`  ${input.adminNotes.trim()}`);
  }

  if (input.trackingLink) {
    lines.push('');
    lines.push(`Tracking: ${input.trackingLink}`);
  }

  return lines.join('\n');
}
