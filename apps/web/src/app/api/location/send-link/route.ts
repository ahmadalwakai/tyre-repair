import { NextResponse } from 'next/server';
import { locationSendLinkSchema } from '@/lib/quote/validation';
import {
  createLocationCaptureToken,
  LOCATION_TOKEN_EXPIRY_MINUTES,
} from '@/lib/security/location-token';
import { sendLocationSmsLink } from '@/lib/integrations/twilio';
import { sendLocationEmailLink } from '@/lib/integrations/resend';
import { siteConfig } from '@/lib/site-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SendLinkSuccess {
  success: true;
  method: 'sms' | 'email';
  expiresInMinutes: number;
  debugUrl?: string;
  /** Provider-side error message, only populated in non-production for debugging. */
  deliveryWarning?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = locationSendLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { method, phone, email } = parsed.data;

  try {
    const tokenInput =
      method === 'sms'
        ? { method: 'sms' as const, phone: phone ?? '' }
        : { method: 'email' as const, email: email ?? '' };
    const created = await createLocationCaptureToken(tokenInput);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl;
    const link = `${baseUrl.replace(/\/$/, '')}/location-capture/${created.token}`;

    let deliveryWarning: string | null = null;

    if (method === 'sms' && phone) {
      try {
        await sendLocationSmsLink({
          phone,
          link,
          expiresInMinutes: created.expiresInMinutes,
        });
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Could not send SMS at this time' },
            { status: 500 },
          );
        }
        deliveryWarning = err instanceof Error ? err.message : 'SMS send failed';
        // eslint-disable-next-line no-console
        console.error('[send-link] SMS provider error:', err);
      }
    } else if (method === 'email' && email) {
      try {
        await sendLocationEmailLink({
          email,
          link,
          expiresInMinutes: created.expiresInMinutes,
        });
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Could not send email at this time' },
            { status: 500 },
          );
        }
        deliveryWarning = err instanceof Error ? err.message : 'Email send failed';
        // eslint-disable-next-line no-console
        console.error('[send-link] Email provider error:', err);
      }
    }

    const result: SendLinkSuccess = {
      success: true,
      method,
      expiresInMinutes: LOCATION_TOKEN_EXPIRY_MINUTES,
    };
    if (process.env.NODE_ENV !== 'production') {
      result.debugUrl = link;
    }
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Could not send location link' }, { status: 500 });
  }
}
