import 'server-only';
import type { SendLocationLinkResult } from '@/types/quote';

export interface SendLocationSmsInput {
  phone: string;
  link: string;
  expiresInMinutes: number;
}

export async function sendLocationSmsLink(
  input: SendLocationSmsInput,
): Promise<SendLocationLinkResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_PHONE ?? process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    throw new Error('Twilio is not configured');
  }

  const body = `TyreRepair UK: share your location for emergency callout pricing. Link expires in ${input.expiresInMinutes} minutes: ${input.link}`;

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams({ To: input.phone, From: from, Body: body });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Twilio SMS failed: ${res.status}`);
  }

  return { success: true, method: 'sms', expiresInMinutes: input.expiresInMinutes };
}
