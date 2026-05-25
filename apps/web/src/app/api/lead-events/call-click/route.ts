import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@tyrerepair/db';
import { ADMIN_CHANNEL, triggerRealtimeEvent } from '@tyrerepair/realtime';
import { safeSendAdminNotification } from '@/lib/notifications/send-admin-notification';
import { writeAuditLogSafe } from '@/lib/audit/audit-log';
import type { LeadCallClickedPayload, RealtimeEvent } from '@tyrerepair/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const tyreProblemTypes = [
  'PUNCTURE_OR_FLAT',
  'DAMAGED_OR_BLOWN_OUT',
  'SLOW_PRESSURE_LOSS',
  'NEEDS_REPLACEMENT',
  'NOT_SURE',
] as const;

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

const callClickSchema = z.object({
  sessionId: z.string().max(160).optional(),
  sourcePage: z.string().max(240).optional(),
  sourceComponent: z.string().max(160).optional(),
  quoteId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  phone: z.string().max(32).optional(),
  customerName: z.string().max(160).optional(),
  tyreProblemType: z.enum(tyreProblemTypes).optional(),
  jobType: z.enum(['ASSESSMENT', 'REPLACEMENT']).optional(),
  locationSummary: z.string().max(240).optional(),
  href: z.string().max(2048).optional(),
  referrer: z.string().max(2048).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = callClickSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const data = parsed.data;
  const userAgent = req.headers.get('user-agent') ?? null;

  // Approximate caller location from the edge (Vercel injects these headers).
  // City-level only, no lat/lng — UK ICO/GDPR legitimate-interest basis for
  // operational use on the admin popup.
  const networkCountry =
    req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry') ?? null;
  const networkRegion =
    req.headers.get('x-vercel-ip-country-region') ??
    req.headers.get('x-vercel-ip-region') ??
    null;
  const networkCityRaw =
    req.headers.get('x-vercel-ip-city') ?? req.headers.get('cf-ipcity') ?? null;
  // Vercel URL-encodes the city header (e.g. "Glasgow" or "London" stays plain,
  // but multi-word cities like "New%20York" need decoding).
  const networkCity = networkCityRaw ? safeDecode(networkCityRaw) : null;

  try {
    const inserted = await db
      .insert(schema.callClickEvents)
      .values({
        sessionId: data.sessionId ?? null,
        sourcePage: data.sourcePage ?? null,
        sourceComponent: data.sourceComponent ?? null,
        quoteId: data.quoteId ?? null,
        bookingId: data.bookingId ?? null,
        phone: data.phone ?? null,
        customerName: data.customerName ?? null,
        tyreProblemType: data.tyreProblemType ?? null,
        jobType: data.jobType ?? null,
        locationSummary: data.locationSummary ?? null,
        userAgent,
        networkCountry,
        networkRegion,
        networkCity,
        href: data.href ?? null,
        referrer: data.referrer ?? null,
      })
      .returning({ id: schema.callClickEvents.id, createdAt: schema.callClickEvents.createdAt });

    const row = inserted[0];
    if (!row) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const payload: LeadCallClickedPayload = {
      callClickEventId: row.id,
      sourcePage: data.sourcePage ?? null,
      sourceComponent: data.sourceComponent ?? null,
      quoteId: data.quoteId ?? null,
      bookingId: data.bookingId ?? null,
      phone: data.phone ?? null,
      customerName: data.customerName ?? null,
      tyreProblemType: data.tyreProblemType ?? null,
      jobType: data.jobType ?? null,
      networkCity,
      networkRegion,
      networkCountry,
      createdAt: row.createdAt.toISOString(),
    };

    const event: RealtimeEvent = {
      type: 'lead.call.clicked',
      payload,
      createdAt: row.createdAt.toISOString(),
    };

    // Fire realtime + push asynchronously — must not delay the customer's tel: link.
    void triggerRealtimeEvent(ADMIN_CHANNEL, event).catch(() => {});
    void safeSendAdminNotification(event).catch(() => {});
    void writeAuditLogSafe({
      actorType: 'customer',
      action: 'lead.call_button.clicked',
      entityType: 'lead',
      entityId: row.id,
      bookingId: data.bookingId ?? null,
      metadata: {
        sourcePage: data.sourcePage ?? null,
        sourceComponent: data.sourceComponent ?? null,
      },
    });

    return NextResponse.json({ success: true, id: row.id }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
