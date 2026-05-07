import 'server-only';

export interface SendPaymentLinkSmsInput {
  phone: string;
  link: string;
}

export interface SendPaymentLinkSmsResult {
  sent: boolean;
  skippedReason?: 'missing_credentials' | 'send_failed';
}

/**
 * Sends a short SMS containing a secure payment link via Twilio.
 * Never throws — returns a structured result so callers can surface partial
 * success when SMS fails but email succeeds (or vice versa).
 */
export async function sendPaymentLinkSms(
  input: SendPaymentLinkSmsInput,
): Promise<SendPaymentLinkSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_PHONE ?? process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { sent: false, skippedReason: 'missing_credentials' };
  }

  const body = `TyreRepair UK: here is your secure payment link: ${input.link}`;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams({ To: input.phone, From: from, Body: body });

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
