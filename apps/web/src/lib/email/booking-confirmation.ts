import { Resend } from 'resend';
import { siteConfig } from '@/lib/site-config';
import type {
  BookingConfirmationEmailInput,
  BookingConfirmationEmailResult,
} from './types';

const SPECIAL_ORDER_LINE = 'Special order — fitted within 3 working days';

function lockingNutHtml(
  status: BookingConfirmationEmailInput['lockingWheelNutStatus'],
): string {
  switch (status) {
    case 'HAVE_KEY':
      return '<p style="margin:0 0 4px"><strong>Locking wheel nut:</strong> \u2705 Key in car</p>';
    case 'NO_KEY':
      return '<p style="margin:0 0 4px;color:#ff6b6b"><strong>Locking wheel nut:</strong> \u26a0\ufe0f MISSING KEY \u2013 Call customer before dispatch</p>';
    case 'STANDARD_ONLY':
    default:
      return '<p style="margin:0 0 4px"><strong>Locking wheel nut:</strong> \ud83d\udd27 Standard nuts only</p>';
  }
}

function lockingNutText(
  status: BookingConfirmationEmailInput['lockingWheelNutStatus'],
): string {
  switch (status) {
    case 'HAVE_KEY':
      return 'Locking wheel nut: Key in car';
    case 'NO_KEY':
      return 'Locking wheel nut: MISSING KEY \u2013 Call customer before dispatch';
    case 'STANDARD_ONLY':
    default:
      return 'Locking wheel nut: Standard nuts only';
  }
}

function buildHtml(input: BookingConfirmationEmailInput): string {
  const safeName = escapeHtml(input.customerName);
  const safeTracking = escapeHtml(input.trackingId);
  const safeUrl = escapeHtml(input.trackingUrl);
  const safeTyre = escapeHtml(input.tyreLabel);
  const safeTotal = escapeHtml(input.totalPaidGbp);
  const isAssessment = input.jobType === 'ASSESSMENT';
  const headline = isAssessment
    ? 'Your emergency tyre assessment is confirmed.'
    : 'Your emergency tyre booking has been confirmed.';
  const tyreLineLabel = isAssessment ? 'Booking type' : 'Tyre';
  const totalLabel = isAssessment ? 'Assessment fee paid' : 'Total paid';
  const backupBlock =
    isAssessment && input.backupTyreLabel
      ? `<p style="margin:0 0 16px"><strong>Backup tyre noted:</strong> ${escapeHtml(input.backupTyreLabel)} \u2014 only charged if fitted on site.</p>`
      : '';
  const assessmentBlock = isAssessment
    ? `<p style="margin:16px 0;color:#b78b2c">We&rsquo;ll come out and inspect the tyre. If it&rsquo;s safe to repair, we&rsquo;ll repair it on the spot. If a replacement is needed, we&rsquo;ll quote it on site \u2014 you only pay for a new tyre if you choose to go ahead.</p>`
    : '';
  const specialBlock = input.isSpecialOrder
    ? `<p style="margin:16px 0;color:#b78b2c;font-weight:600">${SPECIAL_ORDER_LINE}</p>`
    : '';
  const isDeposit = input.paymentMode === 'DEPOSIT';
  const depositBlock = isDeposit
    ? `<div style="margin:16px 0;padding:12px;border:1px solid #d4a544;border-radius:6px;background:#1a1505">
        <p style="margin:0 0 6px;color:#d4a544;font-weight:600">15% dispatch deposit received</p>
        <p style="margin:0 0 6px">Your emergency booking is confirmed with a 15% dispatch deposit.</p>
        <p style="margin:0 0 4px"><strong>Deposit paid today:</strong> £${escapeHtml(input.depositAmountGbp ?? input.totalPaidGbp)}</p>
        <p style="margin:0 0 4px"><strong>Remaining balance:</strong> £${escapeHtml(input.balanceDueGbp ?? '0.00')}</p>
        ${input.totalPriceGbp ? `<p style="margin:0 0 4px"><strong>Total job price:</strong> £${escapeHtml(input.totalPriceGbp)}</p>` : ''}
        <p style="margin:8px 0 0;font-size:13px;color:#ccc">Your 15% dispatch deposit is non-refundable once dispatch or work has started, subject to our cancellation policy.</p>
        ${input.cancellationPolicyUrl ? `<p style="margin:8px 0 0"><a href="${escapeHtml(input.cancellationPolicyUrl)}" style="color:#d4a544">View cancellation policy</a></p>` : ''}
      </div>`
    : '';
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#0a0a0a;color:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:24px">
    <h1 style="font-family:Cinzel,serif;color:#d4a544;font-size:22px;margin:0 0 8px">TyreRepair UK</h1>
    <p style="margin:0 0 16px">Hi ${safeName},</p>
    <p style="margin:0 0 16px">${headline}</p>
    <p style="margin:0 0 4px"><strong>Tracking ID:</strong> ${safeTracking}</p>
    <p style="margin:0 0 16px"><a href="${safeUrl}" style="color:#d4a544">${safeUrl}</a></p>
    <p style="margin:0 0 4px"><strong>${tyreLineLabel}:</strong> ${safeTyre}</p>
    ${backupBlock}
    <p style="margin:0 0 16px"><strong>${totalLabel}:</strong> £${safeTotal}</p>
    ${lockingNutHtml(input.lockingWheelNutStatus)}
    ${assessmentBlock}
    ${specialBlock}
    ${depositBlock}
    <hr style="border:0;border-top:1px solid #2a2a2a;margin:24px 0" />
    <p style="margin:0 0 4px"><strong>Phone:</strong> ${siteConfig.phoneDisplay}</p>
    <p style="margin:0 0 4px"><strong>WhatsApp:</strong> ${siteConfig.whatsappDisplay}</p>
    <p style="margin:0 0 4px"><strong>Address:</strong> ${siteConfig.address}</p>
  </div>
</body></html>`;
}

function buildText(input: BookingConfirmationEmailInput): string {
  const isAssessment = input.jobType === 'ASSESSMENT';
  const headline = isAssessment
    ? 'Your emergency tyre assessment is confirmed.'
    : 'Your emergency tyre booking has been confirmed.';
  const tyreLineLabel = isAssessment ? 'Booking type' : 'Tyre';
  const totalLabel = isAssessment ? 'Assessment fee paid' : 'Total paid';
  const lines = [
    `Hi ${input.customerName},`,
    '',
    headline,
    '',
    `Tracking ID: ${input.trackingId}`,
    `Tracking link: ${input.trackingUrl}`,
    '',
    `${tyreLineLabel}: ${input.tyreLabel}`,
  ];
  if (isAssessment && input.backupTyreLabel) {
    lines.push(`Backup tyre noted: ${input.backupTyreLabel} — only charged if fitted on site.`);
  }
  lines.push(`${totalLabel}: £${input.totalPaidGbp}`, lockingNutText(input.lockingWheelNutStatus));
  if (isAssessment) {
    lines.push(
      '',
      "We'll come out and inspect the tyre. If it's safe to repair, we'll repair it on the spot. If a replacement is needed, we'll quote it on site — you only pay for a new tyre if you choose to go ahead.",
    );
  }
  if (input.isSpecialOrder) lines.push('', SPECIAL_ORDER_LINE);
  if (input.paymentMode === 'DEPOSIT') {
    lines.push(
      '',
      '15% dispatch deposit received',
      'Your emergency booking is confirmed with a 15% dispatch deposit.',
      `Deposit paid today: £${input.depositAmountGbp ?? input.totalPaidGbp}`,
      `Remaining balance: £${input.balanceDueGbp ?? '0.00'}`,
    );
    if (input.totalPriceGbp) lines.push(`Total job price: £${input.totalPriceGbp}`);
    lines.push(
      'Your 15% dispatch deposit is non-refundable once dispatch or work has started, subject to our cancellation policy.',
    );
    if (input.cancellationPolicyUrl) lines.push(`Cancellation policy: ${input.cancellationPolicyUrl}`);
  }
  lines.push(
    '',
    `Phone: ${siteConfig.phoneDisplay}`,
    `WhatsApp: ${siteConfig.whatsappDisplay}`,
    `Address: ${siteConfig.address}`,
  );
  return lines.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendBookingConfirmationEmail(
  input: BookingConfirmationEmailInput,
): Promise<BookingConfirmationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey) return { sent: false, skippedReason: 'no_api_key' };
  if (!from) return { sent: false, skippedReason: 'no_from' };
  if (!input.to) return { sent: false, skippedReason: 'no_to' };

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: input.to,
      subject:
        input.paymentMode === 'DEPOSIT'
          ? 'Your TyreRepair UK emergency booking is confirmed (15% dispatch deposit received)'
          : 'Your TyreRepair UK emergency booking is confirmed',
      html: buildHtml(input),
      text: buildText(input),
    });
    if (result.error) {
      return { sent: false, skippedReason: 'send_failed' };
    }
    const out: BookingConfirmationEmailResult = { sent: true };
    if (result.data?.id) out.providerMessageId = result.data.id;
    return out;
  } catch {
    return { sent: false, skippedReason: 'send_failed' };
  }
}
