import 'server-only';

export type PaymentPurpose = 'booking' | 'adjustment';

export interface SendPaymentLinkEmailInput {
  to: string;
  customerName?: string | null;
  paymentPurpose: PaymentPurpose;
  amountGbp?: string | null;
  link: string;
  businessPhone?: string;
  whatsappLink?: string;
}

export interface SendPaymentLinkEmailResult {
  sent: boolean;
  skippedReason?: 'missing_credentials' | 'send_failed';
}

/**
 * Sends a payment-link email via Resend. Never throws — returns a structured
 * result so callers can degrade gracefully when email fails.
 */
export async function sendPaymentLinkEmail(
  input: SendPaymentLinkEmailInput,
): Promise<SendPaymentLinkEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  if (!apiKey) return { sent: false, skippedReason: 'missing_credentials' };

  const subject = 'Payment link from TyreRepair UK';
  const purposeText =
    input.paymentPurpose === 'adjustment'
      ? 'replacement tyre payment'
      : 'emergency tyre booking';
  const amountLine = input.amountGbp ? `Amount: £${input.amountGbp}` : '';
  const greeting = input.customerName ? `Hi ${input.customerName},` : 'Hello,';

  const text = [
    greeting,
    '',
    `Here is your secure payment link for your ${purposeText}.`,
    amountLine,
    '',
    input.link,
    '',
    input.businessPhone ? `Need help? Call ${input.businessPhone}.` : '',
    input.whatsappLink ? `WhatsApp: ${input.whatsappLink}` : '',
    '',
    'TyreRepair UK',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#0A0A0A;color:#FFFFFF;padding:24px">
    <h2 style="color:#E30613;margin:0 0 12px">Payment link from TyreRepair UK</h2>
    <p>${greeting.replace(/</g, '&lt;')}</p>
    <p>Here is your secure payment link for your ${purposeText}.</p>
    ${input.amountGbp ? `<p style="font-size:18px"><strong>Amount: £${input.amountGbp}</strong></p>` : ''}
    <p><a href="${input.link}" style="background:#E30613;color:#0A0A0A;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">Complete payment</a></p>
    ${input.businessPhone ? `<p style="color:#B8B8B8;font-size:13px">Need help? Call ${input.businessPhone}.</p>` : ''}
    ${input.whatsappLink ? `<p style="color:#B8B8B8;font-size:13px"><a style="color:#E30613" href="${input.whatsappLink}">WhatsApp us</a></p>` : ''}
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
