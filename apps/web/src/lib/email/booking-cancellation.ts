import 'server-only';

export type CancellationStage =
  | 'before_dispatch'
  | 'after_dispatch'
  | 'on_site'
  | 'after_work_started'
  | 'customer_no_show'
  | 'cannot_complete';

export type DepositDecision =
  | 'not_applicable'
  | 'refund_deposit'
  | 'retain_deposit'
  | 'partial_refund'
  | 'balance_due'
  | 'manual_review';

export interface SendBookingCancellationEmailInput {
  to: string;
  customerName: string;
  trackingId: string;
  reason: string;
  stage: CancellationStage;
  depositDecision: DepositDecision;
  depositAmountGbp?: string | null;
  retainedAmountGbp?: string | null;
  refundDueGbp?: string | null;
  customerMessage?: string | null;
  cancellationPolicyUrl: string;
  businessPhone?: string;
  whatsappLink?: string;
}

export interface SendBookingCancellationEmailResult {
  sent: boolean;
  skippedReason?: 'missing_credentials' | 'send_failed' | 'no_to';
}

function depositSentence(input: SendBookingCancellationEmailInput): string {
  switch (input.depositDecision) {
    case 'refund_deposit':
      return 'A refund has been marked for review. TyreRepair UK will contact you if any further details are needed.';
    case 'retain_deposit':
      return 'Your dispatch deposit has been marked as retained because dispatch or work had already started, subject to our cancellation policy.';
    case 'partial_refund':
      return 'A partial refund has been marked for review. TyreRepair UK will contact you with the next steps.';
    case 'balance_due':
      return 'A balance amount has been recorded for this booking. TyreRepair UK will contact you about the next steps.';
    case 'manual_review':
      return 'This cancellation has been flagged for manual review. TyreRepair UK will contact you shortly.';
    case 'not_applicable':
    default:
      return '';
  }
}

/**
 * Sends a calm, customer-safe cancellation update email via Resend.
 * Never throws — returns a structured result.
 *
 * Important: this email NEVER claims that a refund has been processed.
 * Refunds are decided manually inside Stripe by the operator.
 */
export async function sendBookingCancellationEmail(
  input: SendBookingCancellationEmailInput,
): Promise<SendBookingCancellationEmailResult> {
  if (!input.to) return { sent: false, skippedReason: 'no_to' };
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  if (!apiKey) return { sent: false, skippedReason: 'missing_credentials' };

  const subject = 'TyreRepair UK booking cancellation update';
  const greeting = `Hi ${input.customerName ?? 'there'},`;
  const depositCopy = depositSentence(input);

  const lines: string[] = [
    greeting,
    '',
    `Your TyreRepair UK booking ${input.trackingId} has been cancelled.`,
    '',
    `Reason: ${input.reason}`,
  ];
  if (input.depositAmountGbp) {
    lines.push('', `Deposit on file: £${input.depositAmountGbp}`);
  }
  if (input.retainedAmountGbp) {
    lines.push(`Retained: £${input.retainedAmountGbp}`);
  }
  if (input.refundDueGbp) {
    lines.push(`Marked for refund review: £${input.refundDueGbp}`);
  }
  if (depositCopy) {
    lines.push('', depositCopy);
  }
  if (input.customerMessage) {
    lines.push('', input.customerMessage);
  }
  lines.push(
    '',
    `Cancellation policy: ${input.cancellationPolicyUrl}`,
    '',
    input.businessPhone ? `Need help? Call ${input.businessPhone}.` : '',
    input.whatsappLink ? `WhatsApp: ${input.whatsappLink}` : '',
    '',
    'TyreRepair UK',
  );
  const text = lines.filter(Boolean).join('\n');

  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#0A0A0A;color:#FFFFFF;padding:24px">
    <h2 style="color:#FFD700;margin:0 0 12px">TyreRepair UK booking cancellation update</h2>
    <p>${greeting}</p>
    <p>Your booking <strong>${input.trackingId}</strong> has been cancelled.</p>
    <p><strong>Reason:</strong> ${escapeHtml(input.reason)}</p>
    ${input.depositAmountGbp ? `<p>Deposit on file: <strong>£${input.depositAmountGbp}</strong></p>` : ''}
    ${input.retainedAmountGbp ? `<p>Retained: <strong>£${input.retainedAmountGbp}</strong></p>` : ''}
    ${input.refundDueGbp ? `<p>Marked for refund review: <strong>£${input.refundDueGbp}</strong></p>` : ''}
    ${depositCopy ? `<p>${escapeHtml(depositCopy)}</p>` : ''}
    ${input.customerMessage ? `<p>${escapeHtml(input.customerMessage)}</p>` : ''}
    <p style="margin-top:18px"><a style="color:#D4AF37" href="${input.cancellationPolicyUrl}">Read our cancellation policy</a></p>
    ${input.businessPhone ? `<p style="color:#B8B8B8;font-size:13px">Need help? Call ${input.businessPhone}.</p>` : ''}
    ${input.whatsappLink ? `<p style="color:#B8B8B8;font-size:13px"><a style="color:#D4AF37" href="${input.whatsappLink}">WhatsApp us</a></p>` : ''}
  </body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from, to: [input.to], subject, text, html }),
      cache: 'no-store',
    });
    if (!res.ok) return { sent: false, skippedReason: 'send_failed' };
    return { sent: true };
  } catch {
    return { sent: false, skippedReason: 'send_failed' };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
