import 'server-only';
import type { SendLocationLinkResult } from '@/types/quote';

export interface SendLocationEmailInput {
  email: string;
  link: string;
  expiresInMinutes: number;
}

export async function sendLocationEmailLink(
  input: SendLocationEmailInput,
): Promise<SendLocationLinkResult> {
  const apiKey = process.env.RESEND_API_KEY;
  // Resend requires either a verified domain sender or the sandbox sender
  // 'onboarding@resend.dev' (which can only deliver to the account owner's email).
  // Default to the sandbox sender when no FROM is configured so dev doesn't
  // silently 403 against an unverified domain.
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  if (!apiKey) {
    throw new Error('Resend is not configured (missing RESEND_API_KEY)');
  }

  const subject = 'Share your location with TyreRepair UK';
  const text = [
    'TyreRepair UK needs your location to price your emergency tyre callout.',
    '',
    `Tap or click the link below to share your location. The link expires in ${input.expiresInMinutes} minutes.`,
    '',
    input.link,
    '',
    'If you did not request this, please ignore this email.',
  ].join('\n');

  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#0A0A0A;color:#FFFFFF;padding:24px">
    <h2 style="color:#FFD700;margin:0 0 12px">Share your location with TyreRepair UK</h2>
    <p>We need your location to price your emergency tyre callout.</p>
    <p><a href="${input.link}" style="background:#D4AF37;color:#0A0A0A;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">Share my location</a></p>
    <p style="color:#B8B8B8;font-size:13px">This link expires in ${input.expiresInMinutes} minutes.</p>
  </body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from, to: [input.email], subject, text, html }),
    cache: 'no-store',
  });

  if (!res.ok) {
    let detail = '';
    try {
      const j = (await res.json()) as { message?: string };
      detail = j?.message ? ` — ${j.message}` : '';
    } catch {
      // ignore
    }
    throw new Error(`Resend email failed: ${res.status}${detail}`);
  }

  return { success: true, method: 'email', expiresInMinutes: input.expiresInMinutes };
}
