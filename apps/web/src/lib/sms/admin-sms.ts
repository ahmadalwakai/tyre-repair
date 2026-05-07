import 'server-only';

/**
 * Admin Efficiency Pack — generic Twilio SMS sender.
 *
 * Used for follow-up SMS, location-request SMS, and other short
 * admin-triggered messages. Never throws — returns structured result.
 */

export interface SendAdminSmsInput {
  phone: string;
  body: string;
}

export interface SendAdminSmsResult {
  sent: boolean;
  skippedReason?: 'missing_credentials' | 'send_failed';
}

export async function sendAdminSms(input: SendAdminSmsInput): Promise<SendAdminSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_PHONE ?? process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { sent: false, skippedReason: 'missing_credentials' };
  }

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams({ To: input.phone, From: from, Body: input.body });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        cache: 'no-store',
      },
    );
    if (!res.ok) return { sent: false, skippedReason: 'send_failed' };
    return { sent: true };
  } catch {
    return { sent: false, skippedReason: 'send_failed' };
  }
}
