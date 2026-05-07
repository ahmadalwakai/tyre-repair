/**
 * Send a recovery SMS to a customer who started checkout but has not paid.
 *
 * Re-uses the booking's existing tracking link so the customer can resume
 * payment in one tap. Returns 404 if booking is no longer pending_payment.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import { sendSms } from '@/lib/sms/voodoo';
import { siteConfig } from '@/lib/site-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  context: { params: Promise<{ bookingId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const { bookingId } = await context.params;
  if (!z.string().uuid().safeParse(bookingId).success) {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
  }

  const rows = await db
    .select({
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      status: schema.bookings.status,
      customerName: schema.customers.fullName,
      customerPhone: schema.customers.phone,
    })
    .from(schema.bookings)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);

  const row = rows[0];
  if (!row) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (row.status !== 'pending_payment') {
    return NextResponse.json(
      { error: 'Booking is no longer pending payment' },
      { status: 409 },
    );
  }
  if (!row.customerPhone) {
    return NextResponse.json(
      { ok: false, skipped: 'no_phone', error: 'Customer has no phone number' },
      { status: 400 },
    );
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl;
  const link = `${base.replace(/\/$/, '')}/track/${row.trackingId}`;
  const firstName = row.customerName ? row.customerName.split(' ')[0] : '';
  const greeting = firstName ? `Hi ${firstName}, ` : 'Hi, ';
  const message =
    `${greeting}your TyreRepair booking ${row.trackingId} is still waiting for payment. ` +
    `Tap to complete: ${link}. Reply CALL if you need help.`;

  const result = await sendSms({ to: row.customerPhone, message });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? result.skipped ?? 'send_failed' },
      { status: result.skipped === 'no_api_key' ? 503 : 502 },
    );
  }

  return NextResponse.json({ ok: true, sentTo: row.customerPhone, trackingId: row.trackingId });
}
