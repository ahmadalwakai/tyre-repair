import 'server-only';

export interface SendLocationLinkEmailInput {
  to: string;
  customerName?: string;
  link: string;
  expiresInMinutes: number;
}

export interface SendLocationLinkEmailResult {
  sent: boolean;
  skippedReason?: 'missing_credentials' | 'send_failed';
}

/**
 * Sends a location-capture link email via Resend. Never throws.
 * Returns a structured result so the admin UI can degrade gracefully when
 * RESEND_API_KEY is not configured.
 */
export async function sendLocationLinkEmail(
  input: SendLocationLinkEmailInput,
): Promise<SendLocationLinkEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  if (!apiKey) return { sent: false, skippedReason: 'missing_credentials' };

  const greeting = input.customerName ? `Hi ${input.customerName},` : 'Hello,';
  const subject = 'Please share your location — TyreRepair UK';
  const text = [
    greeting,
    '',
    'Please share your exact location so our technician can find you quickly:',
    input.link,
    '',
    `This link is valid for ${input.expiresInMinutes} minutes.`,
    '',
    'TyreRepair UK',
  ].join('\n');

  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#0A0A0A;color:#FFFFFF;padding:24px">
    <h2 style="color:#E30613;margin:0 0 12px">Share your location</h2>
    <p>${greeting.replace(/</g, '&lt;')}</p>
    <p>Please share your exact location so our technician can find you quickly.</p>
    <p><a href="${input.link}" style="background:#E30613;color:#0A0A0A;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">Share my location</a></p>
    <p style="color:#B8B8B8;font-size:12px">This link is valid for ${input.expiresInMinutes} minutes.</p>
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
