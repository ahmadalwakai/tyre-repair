/**
 * Voodoo SMS provider.
 *
 * Docs: https://www.voodoosms.com/api-documentation
 *
 * Uses the REST endpoint:
 *   POST https://api.voodoosms.com/sendsms
 *   Authorization: Bearer <VOODOO_SMS_API_KEY>
 *   Body: { to, from, msg }
 *
 * Phone numbers must be in international format without leading + (e.g.
 * "447700900000"). This module normalises common UK formats.
 *
 * Environment variables:
 *   VOODOO_SMS_API_KEY     — required, API token
 *   VOODOO_SMS_SENDER      — optional sender id (default "TyreRepair")
 *   VOODOO_SMS_DRY_RUN     — if "true", logs instead of sending (dev/test)
 */

const VOODOO_ENDPOINT = 'https://api.voodoosms.com/sendsms';

export interface SendSmsInput {
  to: string;
  message: string;
  from?: string;
}

export interface SendSmsResult {
  ok: boolean;
  skipped?: 'no_api_key' | 'invalid_phone' | 'dry_run';
  status?: number;
  reference?: string | null;
  error?: string;
}

/**
 * Normalise a phone number to Voodoo's expected international format
 * (digits only, no leading + or 00). Returns null if it can't be normalised.
 *
 * Accepts:
 *   "07700900000"     -> "447700900000"
 *   "+447700900000"   -> "447700900000"
 *   "00447700900000"  -> "447700900000"
 *   "447700900000"    -> "447700900000"
 */
export function normaliseUkMsisdn(input: string): string | null {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `44${digits.slice(1)}`;
  if (!/^\d{10,15}$/.test(digits)) return null;
  return digits;
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const apiKey = process.env.VOODOO_SMS_API_KEY;
  if (!apiKey) {
    return { ok: false, skipped: 'no_api_key' };
  }
  const to = normaliseUkMsisdn(input.to);
  if (!to) {
    return { ok: false, skipped: 'invalid_phone' };
  }
  const from = (input.from ?? process.env.VOODOO_SMS_SENDER ?? 'TyreRepair').slice(0, 11);
  const msg = input.message.slice(0, 1530); // 10 segment safety cap

  if (process.env.VOODOO_SMS_DRY_RUN === 'true') {
    // eslint-disable-next-line no-console
    console.info('[voodoo-sms:dry-run]', { to, from, msg });
    return { ok: true, skipped: 'dry_run' };
  }

  let res: Response;
  try {
    res = await fetch(VOODOO_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ to, from, msg }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* ignore non-JSON */
  }

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: message };
  }

  let reference: string | null = null;
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b['reference_id'] === 'string') reference = b['reference_id'];
    else if (typeof b['reference'] === 'string') reference = b['reference'];
  }

  return { ok: true, status: res.status, reference };
}
