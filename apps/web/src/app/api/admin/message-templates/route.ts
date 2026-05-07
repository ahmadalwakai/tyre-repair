import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema, eq } from '@tyrerepair/db';
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin/auth';
import {
  listAdminMessageTemplates,
  renderAdminMessageTemplate,
  type AdminMessageTemplateKey,
} from '@/lib/messages/admin-message-templates';
import { siteConfig } from '@/lib/site-config';
import { getBookingPaymentSummary } from '@/lib/payments/payment-summary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  templateKey: z
    .enum([
      'ON_OUR_WAY',
      'PAYMENT_REMINDER',
      'LOCATION_CONFIRMATION',
      'MISSING_LOCKING_NUT_KEY',
      'BALANCE_DUE',
      'NO_ANSWER_FOLLOW_UP',
      'ASSESSMENT_EXPLANATION',
      'TRACKING_LINK',
      'CALLBACK_REPLY',
    ])
    .optional(),
  bookingId: z.string().uuid().optional(),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAdmin(req);
  } catch (err) {
    const { status, body } = adminAuthErrorResponse(err);
    return NextResponse.json(body, { status });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    templateKey: url.searchParams.get('templateKey') ?? undefined,
    bookingId: url.searchParams.get('bookingId') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const templates = listAdminMessageTemplates();

  if (!parsed.data.templateKey || !parsed.data.bookingId) {
    return NextResponse.json({ templates });
  }

  const rows = await db
    .select({
      bookingId: schema.bookings.id,
      trackingId: schema.bookings.trackingId,
      customerName: schema.customers.fullName,
      customerPhone: schema.customers.phone,
      addressLine1: schema.customerLocations.addressLine1,
      city: schema.customerLocations.city,
      postcode: schema.customerLocations.postcode,
      quoteId: schema.bookings.quoteId,
    })
    .from(schema.bookings)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .leftJoin(
      schema.customerLocations,
      eq(schema.customerLocations.id, schema.bookings.locationId),
    )
    .where(eq(schema.bookings.id, parsed.data.bookingId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.baseUrl).replace(/\/$/, '');
  const trackingLink = `${baseUrl}/track/${row.trackingId}`;
  const paymentLink = row.quoteId ? `${baseUrl}/checkout?quoteId=${row.quoteId}` : null;
  const balanceLink = `${baseUrl}/pay-balance/${row.bookingId}`;
  const summary = await getBookingPaymentSummary(row.bookingId).catch(() => null);

  const locationLabel = [row.addressLine1, row.city, row.postcode].filter(Boolean).join(', ');

  const renderedMessage = renderAdminMessageTemplate(
    parsed.data.templateKey as AdminMessageTemplateKey,
    {
      customerName: row.customerName ?? 'there',
      trackingId: row.trackingId,
      paymentLink: paymentLink ?? null,
      balanceLink,
      trackingLink,
      servicePhoneNumber: siteConfig.phoneDisplay,
      whatsappNumber: siteConfig.whatsappDisplay,
      locationLabel: locationLabel || null,
      balanceDueGbp: summary?.balanceDueGbp ?? null,
    },
  );

  return NextResponse.json({
    templates,
    renderedMessage,
    customerPhone: row.customerPhone,
  });
}
