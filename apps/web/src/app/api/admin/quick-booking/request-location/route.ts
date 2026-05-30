/**
 * Pre-booking customer location request used by the Quick Booking wizard.
 *
 * The wizard needs to send a location-capture link BEFORE a booking exists,
 * so this endpoint mirrors the post-booking variant but takes phone+email
 * directly. It reuses `createLocationCaptureToken` so the link still resolves
 * at /location-capture/[token] with the same security guarantees.
 *
 * Channels:
 *   - SMS   → sends via existing Twilio `sendAdminSms`
 *   - EMAIL → sends via Resend (sendLocationLinkEmail)
 *   - WHATSAPP_LINK → does NOT send anything server-side. Returns a wa.me URL
 *     containing the secure location link, so the admin can open WhatsApp on
 *     their device and the customer receives the link from the admin's account.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import { sendAdminSms } from '@/lib/sms/admin-sms';
import { siteConfig } from '@/lib/site-config';
import {
  createLocationCaptureToken,
  LOCATION_TOKEN_EXPIRY_MINUTES,
} from '@/lib/security/location-token';
import { sendLocationLinkEmail } from '@/lib/email/location-link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    channel: z.enum(['SMS', 'EMAIL', 'WHATSAPP_LINK', 'COPY_LINK']),
    phone: z.string().trim().min(7).max(32).optional(),
    email: z.string().trim().email().max(320).optional(),
    customerName: z.string().trim().max(160).optional(),
  })
  .refine(
    (v) => {
      if (v.channel === 'EMAIL') return !!v.email;
      if (v.channel === 'SMS' || v.channel === 'WHATSAPP_LINK') return !!v.phone;
      if (v.channel === 'COPY_LINK') return true;
      return false;
    },
    { message: 'Required contact for selected channel is missing' },
  );

interface SuccessResponse {
  success: true;
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP_LINK' | 'COPY_LINK';
  /** URL to open externally (only for WHATSAPP_LINK). */
  externalUrl?: string;
  /** Secure capture token — returned so the admin app can poll for the customer's response. */
  token: string;
  /** Whether the server actually sent a message. False for WHATSAPP_LINK. */
  sent: boolean;
  skippedReason?: 'missing_credentials' | 'send_failed' | 'no_phone' | 'no_email';
  expiresInMinutes: number;
}

interface ErrorResponse {
  error: string;
}

function buildLocationLink(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, '')}/location-capture/${token}`;
}

function buildSmsBody(link: string): string {
  return `TyreRepair UK: Please share your location for your emergency tyre callout: ${link} (valid ${LOCATION_TOKEN_EXPIRY_MINUTES} minutes).`;
}

function normalisePhoneForWhatsApp(raw: string): string {
  // Strip all non-digits. Twilio-style "+44…" works too.
  const digits = raw.replace(/[^\d]/g, '');
  return digits;
}

export async function POST(req: Request): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const data = parsed.data;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl).replace(/\/$/, '');

  // Build a fresh, single-use token for this contact.
  const tokenInput: { method: 'sms' | 'email'; phone?: string; email?: string } = {
    method: data.channel === 'EMAIL' ? 'email' : 'sms',
  };
  if (data.phone) tokenInput.phone = data.phone;
  if (data.email) tokenInput.email = data.email;
  const created = await createLocationCaptureToken(tokenInput);
  const link = buildLocationLink(baseUrl, created.token);

  if (data.channel === 'SMS') {
    if (!data.phone) {
      return NextResponse.json(
        {
          success: true,
          channel: 'SMS',
          token: created.token,
          sent: false,
          skippedReason: 'no_phone',
          expiresInMinutes: LOCATION_TOKEN_EXPIRY_MINUTES,
        },
        { status: 200 },
      );
    }
    const r = await sendAdminSms({ phone: data.phone, body: buildSmsBody(link) });
    await writeAuditLogSafe({
      actorType: 'admin',
      action: 'booking.location_request.sent',
      entityType: 'lead',
      entityId: data.phone,
      actorAdminId: admin.adminId,
      actorLabel: admin.email,
      metadata: { source: 'quick_booking_wizard', channel: 'SMS', sent: r.sent },
    });
    return NextResponse.json(
      {
        success: true,
        channel: 'SMS',
        token: created.token,
        sent: r.sent,
        ...(r.skippedReason ? { skippedReason: r.skippedReason } : {}),
        expiresInMinutes: LOCATION_TOKEN_EXPIRY_MINUTES,
      },
      { status: 200 },
    );
  }

  if (data.channel === 'EMAIL') {
    if (!data.email) {
      return NextResponse.json(
        {
          success: true,
          channel: 'EMAIL',
          token: created.token,
          sent: false,
          skippedReason: 'no_email',
          expiresInMinutes: LOCATION_TOKEN_EXPIRY_MINUTES,
        },
        { status: 200 },
      );
    }
    const emailInput: Parameters<typeof sendLocationLinkEmail>[0] = {
      to: data.email,
      link,
      expiresInMinutes: LOCATION_TOKEN_EXPIRY_MINUTES,
    };
    if (data.customerName) emailInput.customerName = data.customerName;
    const r = await sendLocationLinkEmail(emailInput);
    await writeAuditLogSafe({
      actorType: 'admin',
      action: 'booking.location_request.sent',
      entityType: 'lead',
      entityId: data.email,
      actorAdminId: admin.adminId,
      actorLabel: admin.email,
      metadata: { source: 'quick_booking_wizard', channel: 'EMAIL', sent: r.sent },
    });
    return NextResponse.json(
      {
        success: true,
        channel: 'EMAIL',
        token: created.token,
        sent: r.sent,
        ...(r.skippedReason ? { skippedReason: r.skippedReason } : {}),
        expiresInMinutes: LOCATION_TOKEN_EXPIRY_MINUTES,
      },
      { status: 200 },
    );
  }

  if (data.channel === 'COPY_LINK') {
    await writeAuditLogSafe({
      actorType: 'admin',
      action: 'booking.location_request.sent',
      entityType: 'lead',
      entityId: data.phone ?? data.email ?? null,
      actorAdminId: admin.adminId,
      actorLabel: admin.email,
      metadata: { source: 'quick_booking_wizard', channel: 'COPY_LINK' },
    });
    return NextResponse.json(
      {
        success: true,
        channel: 'COPY_LINK',
        token: created.token,
        sent: false,
        externalUrl: link,
        expiresInMinutes: LOCATION_TOKEN_EXPIRY_MINUTES,
      },
      { status: 200 },
    );
  }

  // WHATSAPP_LINK — never sends server-side, returns a wa.me URL with prefilled text.
  const phoneDigits = normalisePhoneForWhatsApp(data.phone ?? '');
  const message = buildSmsBody(link);
  const externalUrl =
    `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
  await writeAuditLogSafe({
    actorType: 'admin',
    action: 'booking.location_request.sent',
    entityType: 'lead',
    entityId: data.phone ?? null,
    actorAdminId: admin.adminId,
    actorLabel: admin.email,
    metadata: { source: 'quick_booking_wizard', channel: 'WHATSAPP_LINK' },
  });
  return NextResponse.json(
    {
      success: true,
      channel: 'WHATSAPP_LINK',
      token: created.token,
      sent: false,
      externalUrl,
      expiresInMinutes: LOCATION_TOKEN_EXPIRY_MINUTES,
    },
    { status: 200 },
  );
}
